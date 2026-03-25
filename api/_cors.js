// Helper compartido: CORS restringido al dominio de producción
// Configura APP_DOMAIN en las env vars de Vercel (ej: "https://tradingsurvivor.com,https://www.tradingsurvivor.com")
export function setCors(req, res) {
    const allowed = (process.env.APP_DOMAIN || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    const origin = req.headers.origin || '';
    let allowedOrigin;

    if (allowed.length === 0) {
        // Sin APP_DOMAIN configurado → dev local, permitir cualquier origen
        allowedOrigin = origin || '*';
    } else {
        allowedOrigin = allowed.includes(origin) ? origin : allowed[0];
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');
    if (allowed.length > 0) res.setHeader('Vary', 'Origin');
}
