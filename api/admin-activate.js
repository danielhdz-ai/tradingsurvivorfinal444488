// api/admin-activate.js
// Endpoint privado para activar/desactivar suscripciones manualmente
// Protegido con ADMIN_SECRET — solo accesible desde admin.html
//
// Variable de entorno requerida:
//   ADMIN_SECRET         → string secreto que solo tú conoces
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

import { createClient } from '@supabase/supabase-js';
import { setCors } from './_cors.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Rate limiter por IP: máximo 10 intentos fallidos por 15 minutos
const failedAttempts = new Map();
const MAX_FAILS = 10;
const BLOCK_WINDOW_MS = 15 * 60 * 1000;

function isBlocked(ip) {
    const entry = failedAttempts.get(ip);
    if (!entry) return false;
    if (Date.now() > entry.resetAt) { failedAttempts.delete(ip); return false; }
    return entry.count >= MAX_FAILS;
}

function recordFail(ip) {
    const entry = failedAttempts.get(ip) || { count: 0, resetAt: Date.now() + BLOCK_WINDOW_MS };
    entry.count++;
    failedAttempts.set(ip, entry);
}

function clearFails(ip) { failedAttempts.delete(ip); }

export default async function handler(req, res) {
    setCors(req, res);

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Rate limiting por IP antes de cualquier procesamiento
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (isBlocked(clientIp)) {
        return res.status(429).json({ error: 'Demasiados intentos fallidos. Intenta en 15 minutos.' });
    }

    // Verificar secreto admin
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        recordFail(clientIp);
        // Delay artificial para ralentizar fuerza bruta
        await new Promise(r => setTimeout(r, 1000));
        return res.status(401).json({ error: 'No autorizado' });
    }
    clearFails(clientIp);

    // ── GET /api/admin-activate?email=xxx  →  buscar usuario ─────────────────
    if (req.method === 'GET') {
        const email = req.query.email?.trim().toLowerCase();
        if (!email) return res.status(400).json({ error: 'Email requerido' });

        // Buscar usuario en auth.users via admin API
        const { data: users, error: authErr } = await supabase.auth.admin.listUsers();
        if (authErr) return res.status(500).json({ error: authErr.message });

        const user = users.users.find(u => u.email?.toLowerCase() === email);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Buscar suscripción
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        return res.status(200).json({
            userId: user.id,
            email: user.email,
            createdAt: user.created_at,
            subscription: sub || null
        });
    }

    // ── POST /api/admin-activate  →  activar / desactivar ────────────────────
    if (req.method === 'POST') {
        const { userId, email, action, months } = req.body || {};

        if (!userId) return res.status(400).json({ error: 'userId requerido' });
        if (!['activate', 'deactivate'].includes(action)) {
            return res.status(400).json({ error: 'action debe ser activate o deactivate' });
        }

        let updateData;

        if (action === 'activate') {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + (months || 12));

            updateData = {
                user_id: userId,
                plan: 'pro',
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                cancel_at_period_end: false,
                updated_at: now.toISOString()
            };
        } else {
            updateData = {
                user_id: userId,
                plan: 'free',
                status: 'cancelled',
                cancel_at_period_end: false,
                updated_at: new Date().toISOString()
            };
        }

        const { error } = await supabase
            .from('subscriptions')
            .upsert(updateData, { onConflict: 'user_id' });

        if (error) return res.status(500).json({ error: error.message });

        console.log(`[admin-activate] ${action} para user ${userId} (${email})`);
        return res.status(200).json({ ok: true, action, userId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
