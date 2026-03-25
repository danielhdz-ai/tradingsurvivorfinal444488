// api/notify-admin.js
// Módulo compartido de notificaciones al admin vía Resend
// Usado por: stripe-webhook.js, crypto-payment-notify.js, register-notify.js
//
// Variable de entorno requerida:
//   RESEND_API_KEY   → re_...
//   ADMIN_EMAIL      → admintradingsurvivor@gmail.com (o el que configures)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admintradingsurvivor@gmail.com';
const FROM_EMAIL  = 'Trading Survivor <noreply@tradingsurvivor.com>';
const LOGO_URL    = `${process.env.APP_URL || 'https://tradingsurvivor.com'}/logos/tradingsurvivor-logo-clear.png`;

async function sendAdminEmail(subject, html) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.warn('[notify-admin] RESEND_API_KEY no configurado');
        return false;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [ADMIN_EMAIL],
                subject,
                html
            })
        });

        if (response.ok) {
            console.log(`[notify-admin] ✅ Email enviado al admin: ${subject}`);
            return true;
        } else {
            const err = await response.text();
            console.error('[notify-admin] Error Resend:', err);
            return false;
        }
    } catch (err) {
        console.error('[notify-admin] Error de red:', err.message);
        return false;
    }
}

// ── Notificación: nuevo registro ─────────────────────────────────────────────
export async function notifyNewRegister({ email, userId, timestamp }) {
    const fecha = new Date(timestamp || Date.now()).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    return sendAdminEmail(
        `🆕 Nuevo registro — ${email}`,
        `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:32px;border-radius:8px;max-width:480px;">
          <img src="${LOGO_URL}" alt="Trading Survivor" style="height:36px;margin-bottom:16px;display:block;">
          <h2 style="color:#00ff88;margin:0 0 20px;">🆕 Nuevo Usuario Registrado</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#888;width:120px;">Email</td>
                <td style="padding:8px 0;color:#fff;font-weight:bold;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">User ID</td>
                <td style="padding:8px 0;color:#aaa;font-size:12px;">${userId || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Fecha</td>
                <td style="padding:8px 0;color:#fff;">${fecha}</td></tr>
          </table>
          <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #222;color:#555;font-size:12px;">Trading Survivor &nbsp;·&nbsp; <a href="mailto:hola@tradingsurvivor.com" style="color:#555;text-decoration:none;">hola@tradingsurvivor.com</a> &nbsp;·&nbsp; tradingsurvivor.com</p>
        </div>
        `
    );
}

// ── Notificación: pago con Stripe completado ─────────────────────────────────
export async function notifyStripePayment({ email, userId, amount, currency, planExpiry }) {
    const fecha = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const expiry = planExpiry ? new Date(planExpiry).toLocaleDateString('es-ES') : 'N/A';
    return sendAdminEmail(
        `💰 Nuevo pago Stripe — ${email} — $${(amount / 100).toFixed(2)} ${currency?.toUpperCase()}`,
        `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:32px;border-radius:8px;max-width:480px;">
          <img src="${LOGO_URL}" alt="Trading Survivor" style="height:36px;margin-bottom:16px;display:block;">
          <h2 style="color:#00ff88;margin:0 0 20px;">💰 Pago con Stripe Recibido</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#888;width:120px;">Email</td>
                <td style="padding:8px 0;color:#fff;font-weight:bold;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Importe</td>
                <td style="padding:8px 0;color:#00ff88;font-weight:bold;font-size:18px;">$${(amount / 100).toFixed(2)} ${currency?.toUpperCase()}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Plan activo hasta</td>
                <td style="padding:8px 0;color:#fff;">${expiry}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">User ID</td>
                <td style="padding:8px 0;color:#aaa;font-size:12px;">${userId || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Fecha</td>
                <td style="padding:8px 0;color:#fff;">${fecha}</td></tr>
          </table>
          <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #222;color:#555;font-size:12px;">Trading Survivor &nbsp;·&nbsp; <a href="mailto:hola@tradingsurvivor.com" style="color:#555;text-decoration:none;">hola@tradingsurvivor.com</a> &nbsp;·&nbsp; tradingsurvivor.com</p>
        </div>
        `
    );
}

// ── Notificación: pago en cripto (manual, pendiente verificación) ─────────────
export async function notifyCryptoPayment({ email, userId, crypto, amount, address, timestamp }) {
    const fecha = new Date(timestamp || Date.now()).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const cryptoLabels = {
        'usdt-trc20': 'USDT TRC-20 (Tron)',
        'usdt-erc20': 'USDT ERC-20 (Ethereum)',
        'btc': 'Bitcoin (BTC)',
        'eth': 'Ethereum (ETH)'
    };
    const cryptoLabel = cryptoLabels[crypto] || crypto;

    return sendAdminEmail(
        `⚡ Pago cripto pendiente — ${email} — ${cryptoLabel}`,
        `
        <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:32px;border-radius:8px;max-width:480px;">
          <img src="${LOGO_URL}" alt="Trading Survivor" style="height:36px;margin-bottom:16px;display:block;">
          <h2 style="color:#ffaa00;margin:0 0 8px;">⚡ Pago en Cripto — Verificación Manual</h2>
          <p style="color:#ffaa00;margin:0 0 20px;font-size:13px;">⚠️ Requiere verificación manual en blockchain antes de activar acceso</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#888;width:140px;">Email usuario</td>
                <td style="padding:8px 0;color:#fff;font-weight:bold;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Moneda</td>
                <td style="padding:8px 0;color:#ffaa00;font-weight:bold;">${cryptoLabel}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Importe</td>
                <td style="padding:8px 0;color:#fff;">$${amount} USD equivalente</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Dirección</td>
                <td style="padding:8px 0;color:#aaa;font-size:11px;word-break:break-all;">${address}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">User ID</td>
                <td style="padding:8px 0;color:#aaa;font-size:12px;">${userId || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Fecha aviso</td>
                <td style="padding:8px 0;color:#fff;">${fecha}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px;background:#1a1100;border:1px solid #553300;border-radius:6px;">
            <p style="margin:0 0 12px;color:#ffaa00;font-size:13px;font-weight:bold;">Pasos para activar el acceso:</p>
            <p style="margin:0 0 14px;color:#aaa;font-size:13px;line-height:1.6;">
              1. Verifica la transacción en el explorador de bloques<br>
              2. Si es correcta, haz clic aquí para activar con un clic:
            </p>
            <a href="${process.env.APP_URL || 'https://tradingsurvivor.com'}/admin?email=${encodeURIComponent(email)}"
               style="display:inline-block;background:#00ff88;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
              ✅ Abrir panel admin → Activar usuario
            </a>
            <p style="margin:10px 0 0;color:#555;font-size:11px;">El email del usuario ya estará pre-cargado. Solo necesitas tu clave admin.</p>
          </div>
          <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #222;color:#555;font-size:12px;">Trading Survivor &nbsp;·&nbsp; <a href="mailto:hola@tradingsurvivor.com" style="color:#555;text-decoration:none;">hola@tradingsurvivor.com</a> &nbsp;·&nbsp; tradingsurvivor.com</p>
        </div>
        `
    );
}
