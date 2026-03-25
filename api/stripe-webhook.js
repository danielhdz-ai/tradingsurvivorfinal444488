// api/stripe-webhook.js
// Webhook de Stripe — se ejecuta cuando un pago es confirmado
//
// Variables de entorno necesarias en Vercel:
//   STRIPE_SECRET_KEY        →  sk_live_...
//   STRIPE_WEBHOOK_SECRET    →  whsec_... (lo obtienes en Stripe Dashboard → Webhooks)
//   SUPABASE_URL             →  https://xxxxx.supabase.co
//   SUPABASE_SERVICE_KEY     →  service_role key (NO la anon key)
//   RESEND_API_KEY           →  re_... (gratis en resend.com, 3,000 emails/mes)
//   APP_URL                  →  https://trading-survivor-dsft.vercel.app

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { notifyStripePayment } from './_notify-admin.js';

// Supabase con service_role para poder escribir en subscriptions (RLS bypassed)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export const config = {
    api: { bodyParser: false } // Stripe requiere el body raw para verificar la firma
};

// Leer body raw (necesario para verificar firma de Stripe)
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('[webhook] STRIPE_WEBHOOK_SECRET no configurado');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
        const rawBody = await getRawBody(req);
        const signature = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
        console.error('[webhook] Firma inválida:', err.message);
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    console.log(`[webhook] Evento recibido: ${event.type}`);

    try {
        switch (event.type) {

            // ─── Pago único completado (modelo actual $129/año) ───────────────
            case 'payment_intent.succeeded': {
                const pi = event.data.object;
                const userId = pi.metadata?.supabase_user_id;
                const email  = pi.receipt_email;

                if (!userId) {
                    console.warn('[webhook] payment_intent sin supabase_user_id en metadata');
                    break;
                }

                // Calcular fechas: acceso por 1 año
                const now = new Date();
                const periodEnd = new Date(now);
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);

                // Activar suscripción en Supabase
                const { error: subError } = await supabase
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        plan: 'pro',
                        status: 'active',
                        stripe_customer_id: pi.customer || null,
                        current_period_start: now.toISOString(),
                        current_period_end: periodEnd.toISOString(),
                        cancel_at_period_end: false,
                        updated_at: now.toISOString()
                    }, { onConflict: 'user_id' });

                if (subError) {
                    console.error('[webhook] Error actualizando subscriptions:', subError);
                } else {
                    console.log(`[webhook] ✅ Suscripción activada para user ${userId}`);
                }

                // Enviar email de bienvenida al usuario
                if (email) {
                    await sendWelcomeEmail(email, periodEnd);
                }

                // Notificar al admin
                await notifyStripePayment({
                    email: email || 'desconocido',
                    userId,
                    amount: pi.amount,
                    currency: pi.currency,
                    planExpiry: periodEnd.toISOString()
                });
                break;
            }

            // ─── Suscripción recurrente de Stripe (si migras a modelo mensual) ─
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const subscriptionId = invoice.subscription;

                if (!subscriptionId) break; // No es suscripción recurrente

                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const userId = subscription.metadata?.supabase_user_id;
                if (!userId) break;

                const { error } = await supabase
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        plan: 'pro',
                        status: 'active',
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });

                if (error) console.error('[webhook] Error en invoice.payment_succeeded:', error);
                else console.log(`[webhook] ✅ Renovación procesada para user ${userId}`);
                break;
            }

            // ─── Suscripción cancelada o expirada ────────────────────────────
            case 'customer.subscription.deleted':
            case 'invoice.payment_failed': {
                const obj = event.data.object;
                const cusId = obj.customer;

                // Buscar usuario por stripe_customer_id
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('user_id')
                    .eq('stripe_customer_id', cusId)
                    .single();

                if (sub?.user_id) {
                    await supabase
                        .from('subscriptions')
                        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                        .eq('user_id', sub.user_id);

                    console.log(`[webhook] ❌ Suscripción cancelada para user ${sub.user_id}`);
                }
                break;
            }

            default:
                console.log(`[webhook] Evento ignorado: ${event.type}`);
        }

        return res.status(200).json({ received: true });

    } catch (err) {
        console.error('[webhook] Error procesando evento:', err);
        return res.status(500).json({ error: 'Error interno' });
    }
}

// ─── Email de bienvenida con Resend ──────────────────────────────────────────
async function sendWelcomeEmail(email, periodEnd) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.warn('[webhook] RESEND_API_KEY no configurado, email no enviado');
        return;
    }

    const appUrl = process.env.APP_URL || 'https://trading-survivor-dsft.vercel.app';
    const expiryDate = periodEnd.toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Trading Survivor</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;border:1px solid #222;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a2a1a,#0d3d20);padding:40px;text-align:center;">
              <img src="${appUrl}/logos/traders-survivor-logo.png" alt="Trading Survivor" style="height:52px;display:block;margin:0 auto 12px;">
              <p style="margin:0;color:#aaa;font-size:13px;">Trading Journal Profesional</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#00ff88;margin:0 0 16px;font-size:22px;">¡Bienvenido a bordo! 🎉</h2>
              <p style="color:#ccc;line-height:1.7;margin:0 0 20px;">
                Tu pago ha sido procesado correctamente. Ya tienes acceso completo a <strong style="color:#fff;">Trading Survivor PRO</strong>.
              </p>

              <!-- Access info -->
              <div style="background:#0d2b1a;border:1px solid #1a4a2e;border-radius:8px;padding:20px;margin:0 0 28px;">
                <p style="margin:0 0 8px;color:#aaa;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Tu acceso</p>
                <p style="margin:0;color:#00ff88;font-size:16px;font-weight:bold;">PRO — Acceso completo</p>
                <p style="margin:6px 0 0;color:#888;font-size:13px;">Válido hasta el ${expiryDate}</p>
              </div>

              <!-- Quick start steps -->
              <p style="color:#ccc;font-weight:600;margin:0 0 16px;">Empieza en 3 pasos:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;">
                    <span style="color:#00ff88;font-size:18px;margin-right:12px;">1</span>
                    <span style="color:#ddd;">Ve a <strong>Plataformas</strong> y conecta tu exchange o importa un CSV</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;">
                    <span style="color:#00ff88;font-size:18px;margin-right:12px;">2</span>
                    <span style="color:#ddd;">Revisa tu <strong>Dashboard</strong> — tu equity curve y métricas en segundos</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <span style="color:#00ff88;font-size:18px;margin-right:12px;">3</span>
                    <span style="color:#ddd;">Pregúntale al <strong>AI Coach</strong> cuál es tu mejor patrón de trading</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0 0;">
                <a href="${appUrl}/app"
                   style="display:inline-block;background:#00ff88;color:#000;font-weight:700;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                  Abrir mi plataforma →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1a1a1a;text-align:center;">
              <p style="margin:0;color:#555;font-size:12px;">
                ¿Tienes alguna duda? Escríbenos a <a href="mailto:hola@tradingsurvivor.com" style="color:#00ff88;text-decoration:none;">hola@tradingsurvivor.com</a><br>
                © 2026 Trading Survivor &nbsp;·&nbsp; <a href="${appUrl}" style="color:#555;">tradingsurvivor.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Trading Survivor <hola@tradingsurvivor.com>',
                to: [email],
                subject: '¡Bienvenido a Trading Survivor PRO! 🎉 Tu acceso ya está activo',
                html
            })
        });

        if (response.ok) {
            console.log(`[webhook] ✅ Email de bienvenida enviado a ${email}`);
        } else {
            const err = await response.text();
            console.error('[webhook] Error enviando email:', err);
        }
    } catch (err) {
        console.error('[webhook] Error al llamar a Resend:', err.message);
    }
}
