// /api/check-plan — verifica plan PRO del usuario usando el JWT del servidor
// Reemplaza la verificación client-side con ADMIN_EMAILS expuestos
import { createClient } from '@supabase/supabase-js';
import { setCors } from './_cors.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Admin emails viven SOLO en el servidor (Vercel env vars), nunca en el cliente
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

export default async function handler(req, res) {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No authorization token' });

    // Verificar JWT con service_role (no anon key — más seguro)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    // Admin bypass — solo en servidor
    if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(user.email)) {
        return res.status(200).json({
            plan: 'pro',
            status: 'active',
            isAdmin: true,
            expiresAt: null
        });
    }

    // Leer suscripción real desde BD
    const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();

    if (subError || !sub) {
        return res.status(200).json({ plan: 'free', status: 'active', isAdmin: false, expiresAt: null });
    }

    const isExpired = sub.current_period_end && new Date(sub.current_period_end) < new Date();
    const effectivePlan = (sub.plan === 'pro' || sub.plan === 'premium') && sub.status === 'active' && !isExpired
        ? sub.plan
        : 'free';

    return res.status(200).json({
        plan: effectivePlan,
        status: sub.status,
        isAdmin: false,
        expiresAt: sub.current_period_end || null
    });
}
