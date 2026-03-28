// api/create-checkout.js
// Vercel serverless function — crea un PaymentIntent de Stripe
//
// Variables de entorno necesarias (Vercel Dashboard → Settings → Environment Variables):
//   STRIPE_SECRET_KEY  →  sk_live_... (producción) o sk_test_... (pruebas)
//
// Instalar dependencia: npm install stripe

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCors } from './_cors.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    setCors(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // [H-1] Verificar JWT — el userId DEBE venir del token, no del cliente
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'Token de autorización requerido' });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || !secretKey.startsWith('sk_')) {
        return res.status(500).json({ error: 'Stripe no configurado en el servidor' });
    }

    // email puede venir del body para el recibo; si no, usamos el del token
    const email = req.body?.email || user.email;

    // Validación básica de email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email inválido' });
    }

    try {
        const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

        // Crear PaymentIntent por $129 USD
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 12900,           // en centavos → $129.00
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            receipt_email: email,
            metadata: {
                supabase_user_id: user.id,   // [H-1] siempre del JWT, nunca del body
                product: 'Trading Survivor Annual',
                plan: 'annual_129'
            },
            description: 'Trading Survivor — Suscripción Anual'
        });

        return res.status(200).json({ clientSecret: paymentIntent.client_secret });

    } catch (err) {
        console.error('[create-checkout] Stripe error:', err.message);
        return res.status(500).json({ error: 'Error al crear sesión de pago' });
    }
}
