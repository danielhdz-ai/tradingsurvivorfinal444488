// API de credenciales de exchanges — TradingSurvivor
// Requiere Authorization: Bearer <supabase-jwt>
import { createClient } from '@supabase/supabase-js';
import { setCors } from './_cors.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function getUser(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

export default async function handler(req, res) {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'No autenticado' });

    const { action } = req.query;

    try {
        // GET — obtener credenciales (todas o filtradas por exchange)
        if (action === 'get' && req.method === 'GET') {
            const { exchange } = req.query;
            const { data, error } = await supabase
                .from('user_settings')
                .select('settings')
                .eq('user_id', user.id)
                .single();
            if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
            const apiKeys = data?.settings?.api_keys || {};
            if (exchange) {
                return res.status(200).json({ success: true, credentials: apiKeys[exchange] || null });
            }
            return res.status(200).json({ success: true, credentials: apiKeys });
        }

        // SAVE — guardar/actualizar credenciales de un exchange
        if (action === 'save' && req.method === 'POST') {
            const { exchange, apiKey, secretKey, passphrase, accountId } = req.body || {};
            if (!exchange || !apiKey || !secretKey) {
                return res.status(400).json({ error: 'exchange, apiKey y secretKey son obligatorios' });
            }
            const { data: existing } = await supabase
                .from('user_settings')
                .select('settings')
                .eq('user_id', user.id)
                .single();
            const currentApiKeys = existing?.settings?.api_keys || {};
            currentApiKeys[exchange] = {
                apiKey,
                secretKey,
                ...(passphrase && { passphrase }),
                ...(accountId  && { accountId }),
                updatedAt: new Date().toISOString()
            };
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    settings: { ...existing?.settings, api_keys: currentApiKeys },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true });
        }

        // DELETE — borrar credenciales de un exchange
        if (action === 'delete' && (req.method === 'DELETE' || req.method === 'POST')) {
            const exchange = req.query.exchange || req.body?.exchange;
            if (!exchange) return res.status(400).json({ error: 'exchange requerido' });
            const { data: existing } = await supabase
                .from('user_settings')
                .select('settings')
                .eq('user_id', user.id)
                .single();
            const currentApiKeys = existing?.settings?.api_keys || {};
            delete currentApiKeys[exchange];
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    settings: { ...existing?.settings, api_keys: currentApiKeys },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Acción no válida' });
    } catch (err) {
        console.error('[credentials]', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
