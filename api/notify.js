// api/notify.js
// Endpoint unificado de notificaciones
// Maneja: registro de usuario + aviso de pago cripto
//
// POST /api/notify  { type: 'register', email, userId }
// POST /api/notify  { type: 'crypto',   email, userId, crypto, amount, address }

import { createClient } from '@supabase/supabase-js';
import { notifyNewRegister, notifyCryptoPayment } from './_notify-admin.js';
import { setCors } from './_cors.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'Trading Survivor <hola@tradingsurvivor.com>';
const LOGO_URL = `${process.env.APP_URL || 'https://tradingsurvivor.com'}/logos/tradingsurvivor-logo-clear.png`;

// Rate limiter: máximo 3 notificaciones por IP cada 15 minutos
const notifyAttempts = new Map();
const NOTIFY_LIMIT = 3;
const NOTIFY_WINDOW_MS = 15 * 60 * 1000;

function checkNotifyLimit(ip) {
    const now = Date.now();
    const entry = notifyAttempts.get(ip) || { count: 0, resetAt: now + NOTIFY_WINDOW_MS };
    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + NOTIFY_WINDOW_MS; }
    if (entry.count >= NOTIFY_LIMIT) return false;
    entry.count++;
    notifyAttempts.set(ip, entry);
    return true;
}

export default async function handler(req, res) {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Rate limit por IP
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (!checkNotifyLimit(clientIp)) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde.' });
    }

    const { type, email, userId, crypto, amount, address } = req.body || {};

    if (!type || !email) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Validar email básico para evitar inyecciones
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
    }

    // Para tipo 'crypto': verificar que el userId existe en Supabase
    // para prevenir avisos de pago fraudulentos con emails ajenos
    if (type === 'crypto' && userId) {
        const { data: userCheck } = await supabase.auth.admin.getUserById(userId);
        if (!userCheck?.user || userCheck.user.email?.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({ error: 'No autorizado' });
        }
    }

    // ── Registro nuevo ────────────────────────────────────────────────────────
    if (type === 'register') {
        await notifyNewRegister({ email, userId, timestamp: Date.now() });
        return res.status(200).json({ ok: true });
    }

    // ── Aviso pago cripto ─────────────────────────────────────────────────────
    if (type === 'crypto') {
        if (!crypto || !address) {
            return res.status(400).json({ error: 'Faltan campos crypto/address' });
        }

        // 1. Notificar al admin
        await notifyCryptoPayment({ email, userId, crypto, amount, address, timestamp: Date.now() });

        // 2. Confirmación al usuario
        if (RESEND_API_KEY) {
            const cryptoLabels = {
                'usdt-trc20': 'USDT TRC-20 (Tron)',
                'usdt-erc20': 'USDT ERC-20 (Ethereum)',
                'btc': 'Bitcoin (BTC)',
                'eth': 'Ethereum (ETH)'
            };
            const cryptoLabel = cryptoLabels[crypto] || crypto;

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: FROM_EMAIL,
                    to: [email],
                    reply_to: 'admintradingsurvivor@gmail.com',
                    subject: '⏳ Hemos recibido tu aviso de pago — Trading Survivor',
                    html: `
                    <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:32px;border-radius:8px;max-width:520px;margin:auto;">
                      <img src="${LOGO_URL}" alt="Trading Survivor" style="height:40px;margin-bottom:16px;display:block;">
                      <h2 style="color:#00ff88;margin:0 0 8px;">⏳ Pago en revisión</h2>
                      <p style="color:#aaa;margin:0 0 24px;">Hemos recibido tu aviso de pago en criptomoneda.</p>

                      <table style="width:100%;border-collapse:collapse;">
                        <tr><td style="padding:8px 0;color:#888;width:120px;">Moneda</td>
                            <td style="padding:8px 0;color:#ffaa00;font-weight:bold;">${cryptoLabel}</td></tr>
                        <tr><td style="padding:8px 0;color:#888;">Importe</td>
                            <td style="padding:8px 0;color:#fff;">$${amount} USD</td></tr>
                        <tr><td style="padding:8px 0;color:#888;">Dirección</td>
                            <td style="padding:8px 0;color:#aaa;font-size:11px;word-break:break-all;">${address}</td></tr>
                      </table>

                      <div style="margin:24px 0;padding:16px;background:#0d1f0d;border:1px solid #1a4a1a;border-radius:6px;">
                        <p style="margin:0;color:#00ff88;font-size:14px;line-height:1.6;">
                          Verificaremos tu transacción en blockchain en las próximas <strong>24 horas</strong>.<br><br>
                          Una vez confirmada, activaremos tu cuenta Pro y recibirás un email de bienvenida.
                        </p>
                      </div>

                      <p style="margin:0 0 16px;color:#666;font-size:12px;">
                        Si tienes alguna duda escríbenos a
                        <a href="mailto:hola@tradingsurvivor.com" style="color:#00ff88;">hola@tradingsurvivor.com</a>
                      </p>
                      <p style="padding-top:16px;border-top:1px solid #222;color:#555;font-size:12px;">
                        Trading Survivor &nbsp;·&nbsp;
                        <a href="mailto:hola@tradingsurvivor.com" style="color:#555;text-decoration:none;">hola@tradingsurvivor.com</a>
                        &nbsp;·&nbsp; tradingsurvivor.com
                      </p>
                    </div>
                    `
                })
            }).catch(err => console.error('[notify] Error email usuario:', err.message));
        }

        return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'type no reconocido' });
}
