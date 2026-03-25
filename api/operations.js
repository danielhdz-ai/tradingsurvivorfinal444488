// API de operaciones — TradingSurvivor
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
        // CREATE / UPSERT
        if (action === 'create' && req.method === 'POST') {
            const op = req.body;
            if (!op || !op.id) return res.status(400).json({ error: 'Datos de operación requeridos (id obligatorio)' });
            const { data, error } = await supabase
                .from('operations')
                .upsert({ ...op, user_id: user.id }, { onConflict: 'id' })
                .select()
                .single();
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true, operation: data });
        }

        // LIST
        if (action === 'list' && req.method === 'GET') {
            const { accountId, from, to, limit = '2000' } = req.query;
            let query = supabase
                .from('operations')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .limit(Math.min(parseInt(limit) || 2000, 5000));
            if (accountId) query = query.eq('accountId', accountId);
            if (from)      query = query.gte('date', from);
            if (to)        query = query.lte('date', to);
            const { data, error } = await query;
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true, operations: data || [] });
        }

        // UPDATE
        if (action === 'update' && req.method === 'PUT') {
            const { id, ...fields } = req.body || {};
            if (!id) return res.status(400).json({ error: 'id requerido' });
            // Eliminar user_id de los fields para no sobreescribirlo
            delete fields.user_id;
            const { data, error } = await supabase
                .from('operations')
                .update(fields)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true, operation: data });
        }

        // DELETE
        if (action === 'delete' && req.method === 'DELETE') {
            const id = req.query.id || req.body?.id;
            if (!id) return res.status(400).json({ error: 'id requerido' });
            const { error } = await supabase
                .from('operations')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true });
        }

        // BULK-SYNC — upsert masivo desde Dexie al arrancar la app
        if (action === 'bulk-sync' && req.method === 'POST') {
            const { operations } = req.body || {};
            if (!Array.isArray(operations) || operations.length === 0) {
                return res.status(400).json({ error: 'Array de operaciones requerido' });
            }
            if (operations.length > 5000) {
                return res.status(400).json({ error: 'Máximo 5000 operaciones por lote' });
            }
            const rows = operations.map(op => ({ ...op, user_id: user.id }));
            const { error } = await supabase
                .from('operations')
                .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true, synced: rows.length });
        }

        return res.status(400).json({ error: 'Acción no válida' });
    } catch (err) {
        console.error('[operations]', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
