// Vercel Serverless Function - AI Coach para TradingSurvivor
// Requiere Authorization: Bearer <supabase-jwt>
// Powered by OpenRouter — sin restricciones regionales, múltiples modelos gratuitos
import { createClient } from '@supabase/supabase-js';
import { setCors } from './_cors.js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Rate limiter persistente en Supabase: máximo 20 mensajes por usuario por hora
// Usa la tabla ai_coach_rate_limits (ver supabase/schema.sql)
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora

async function checkRateLimit(userId) {
    const now = new Date();
    const { data } = await supabase
        .from('ai_coach_rate_limits')
        .select('count, reset_at')
        .eq('user_id', userId)
        .maybeSingle();

    // Sin registro previo o ventana expirada: reiniciar contador
    if (!data || new Date(data.reset_at) < now) {
        await supabase
            .from('ai_coach_rate_limits')
            .upsert(
                { user_id: userId, count: 1, reset_at: new Date(now.getTime() + RATE_WINDOW_MS).toISOString() },
                { onConflict: 'user_id' }
            );
        return true;
    }

    // Límite alcanzado
    if (data.count >= RATE_LIMIT) return false;

    // Incrementar contador
    await supabase
        .from('ai_coach_rate_limits')
        .update({ count: data.count + 1 })
        .eq('user_id', userId);

    return true;
}

export default async function handler(req, res) {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    // Autenticación obligatoria
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Token inválido' });

    // Rate limiting por usuario (persistente en Supabase)
    if (!await checkRateLimit(user.id)) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en una hora.' });
    }

    try {
        const { message, stats, history, sectionContext } = req.body;

        // Límite de longitud del mensaje
        if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Mensaje requerido' });
        if (message.length > 2000) return res.status(400).json({ error: 'Mensaje demasiado largo (máx 2000 caracteres)' });

        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'API key de OpenRouter no configurada en Vercel (OPENROUTER_API_KEY)' });

        // Helper seguro para formatear números (evita crash si llega null/NaN/Infinity)
        const safeFixed = (v, d = 2) => {
            const n = typeof v === 'number' ? v : parseFloat(v);
            return isFinite(n) ? n.toFixed(d) : '0.00';
        };

        // Construir contexto completo con todas las tablas de datos del trader
        const fmt = (arr, cols) => (arr || []).slice(0, 20).map(row =>
            cols.map(c => `${c}:${typeof row[c] === 'number' ? (row[c] >= 0 ? '+$' : '-$') + Math.abs(row[c]).toFixed(2) : row[c]}`).join(' | ')
        ).join('\n') || 'Sin datos';

        const statsContext = stats ? `
══════════════════════════════════════
DATOS COMPLETOS DEL TRADER
Cuenta: ${stats.accountName}
══════════════════════════════════════

📊 MÉTRICAS GLOBALES (${stats.totalTrades} operaciones totales):
• P&L Neto: ${stats.netPL >= 0 ? '+' : ''}$${safeFixed(stats.netPL)}
• Win Rate: ${safeFixed(stats.winRate, 1)}%  |  Profit Factor: ${safeFixed(stats.profitFactor)}
• R:R Ratio: ${safeFixed(stats.rrRatio)}  |  Max Drawdown: ${safeFixed(stats.maxDrawdown, 1)}%
• Avg Ganancia: +$${safeFixed(stats.avgWin)}  |  Avg Pérdida: -$${safeFixed(stats.avgLoss)}
• Racha actual: ${stats.currentStreak}
• Racha máx. ganadora: ${stats.maxWinStreak} ops  |  Racha máx. perdedora: ${stats.maxLossStreak} ops

🎯 RANKING POR INSTRUMENTO/ACTIVO (todos):
${fmt(stats.instrumentRanking, ['name', 'pl', 'trades', 'wr'])}

🔧 RANKING POR SETUP (todos):
${fmt(stats.setupRanking, ['setup', 'pl', 'trades', 'wr', 'pf'])}

🕐 RANKING POR HORA (mejor→peor):
${(stats.hourRanking || []).map(h => `${h.hour}: ${h.pl >= 0 ? '+' : ''}$${safeFixed(h.pl, 0)} | WR ${h.wr} | ${h.trades}trades`).join('\n')}

📅 RENDIMIENTO POR DÍA DE SEMANA:
${(stats.dayRanking || []).map(d => `${d.day}: ${d.pl >= 0 ? '+' : ''}$${safeFixed(d.pl)} | ${d.trades} trades | WR ${d.wr}`).join('\n')}

🌍 RENDIMIENTO POR SESIÓN:
${(stats.sessionRanking || []).map(s => `${s.session}: ${s.pl >= 0 ? '+' : ''}$${safeFixed(s.pl)} | ${s.trades} trades | WR ${s.wr}`).join('\n')}

📆 EVOLUCIÓN MENSUAL (cronológico):
${(stats.monthRanking || []).map(m => `${m.month}: ${m.pl >= 0 ? '+' : ''}$${safeFixed(m.pl)} | ${m.trades} trades | WR ${m.wr}`).join('\n')}

🏆 TOP 5 MEJORES TRADES:
${(stats.topTrades || []).map((t, i) => `${i + 1}. ${t.date} | ${t.instrument} | +$${safeFixed(t.pl)}`).join('\n')}

💀 TOP 5 PEORES TRADES:
${(stats.worstTrades || []).map((t, i) => `${i + 1}. ${t.date} | ${t.instrument} | $${safeFixed(t.pl)}`).join('\n')}

📋 ÚLTIMOS 15 TRADES (más reciente primero):
${(stats.recentTrades || []).map(t => `${t.date} | ${t.result} | ${t.instrument} | ${t.pl >= 0 ? '+' : ''}$${safeFixed(t.pl)} | Sesión: ${t.session} | Setup: ${t.setup}`).join('\n')}
` : 'El trader aún no tiene operaciones registradas. Pídele que registre sus trades primero para poder analizarlos.';

        // Historial del chat para mantener contexto conversacional
        const conversationHistory = (history || []).slice(-8).map(m => ({
            role: m.role,
            content: m.content
        }));

        const messages = [
            {
                role: 'system',
                content: `Eres **Coach TS**, un coach de trading de élite integrado en la plataforma TradingSurvivor. Tienes acceso completo a los datos reales del trader y eres capaz de detectar patrones que el trader no ve por sí mismo.

## TU METODOLOGÍA DE ANÁLISIS

Cuando analices datos, sigue este proceso mental:
1. **Lee todos los datos** antes de responder — no des la primera conclusión obvia
2. **Busca correlaciones** entre las tablas: ¿el setup X funciona mejor en cierta hora? ¿los lunes con sesión asiática pierden consistentemente?
3. **Detecta anomalías** — WR alto pero PF bajo indica problema de RR; muchos trades en horas malas indica falta de disciplina
4. **Cuantifica todo** — usa números exactos del dataset, nunca generalices sin datos
5. **Prioriza** — identifica el cambio con MAYOR impacto potencial

## REGLAS INAMOVIBLES

- Responde **siempre en español**
- **NUNCA** des consejos genéricos sin citar cifras del dataset real
- Si el dato contradice la intuición del trader, díselo directamente
- Si hay consistencia positiva, reconócelo con números que la prueben
- Cita porcentajes, P&L exacto, win rates específicos al hablar de cualquier tema
- Identifica patrones cruzados: "cuando operas X instrumento en Y horario, el resultado es Z"
- Si hay menos de 30 trades, advierte que el sample size es bajo para conclusiones definitivas

## FORMATO DE RESPUESTA

Usa markdown limpio:
- **Negrita** para métricas importantes
- ## Encabezados para secciones largas
- - Listas para puntos múltiples
- Sin bloque de código a menos que sea una fórmula específica
- Máximo 350 palabras salvo análisis completo solicitado
- Termina con 1 acción concreta y prioritaria

${sectionContext ? `## CONTEXTO ACTUAL DEL TRADER\n${sectionContext}\n` : ''}
## DATOS COMPLETOS DEL TRADER

${statsContext}`
            },
            ...conversationHistory,
            {
                role: 'user',
                content: message
            }
        ];

        // ── Función auxiliar OpenRouter ──
        async function callOpenRouter(model, fallbackModel) {
            // max_tokens alto porque los modelos de razonamiento consumen tokens pensando antes de responder
            // temperature omitido: los modelos de razonamiento no lo soportan
            const body = JSON.stringify({ model, messages, max_tokens: 4000 });
            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://tradingsurvivor.com',
                    'X-Title': 'TradingSurvivor AI Coach'
                },
                body
            });
            if (!resp.ok) {
                let err;
                try { err = await resp.json(); } catch { err = { raw: await resp.text() }; }
                console.warn(`⚠️ OpenRouter [${model}] falló (HTTP ${resp.status}), intentando fallback...`);
                if (fallbackModel) return callOpenRouter(fallbackModel, null);
                return { ok: false, status: resp.status, error: err };
            }
            const json = await resp.json();
            // Algunos modelos de razonamiento devuelven el texto en 'reasoning' si 'content' es null
            const msg = json.choices?.[0]?.message;
            const reply = msg?.content || msg?.reasoning || null;
            return { ok: true, reply };
        }

        // Primario: Step 3.5 Flash (100% uptime, Finance #7) — Fallback: NVIDIA Nemotron 3 Super (99.9% uptime)
        const result = await callOpenRouter(
            'stepfun/step-3.5-flash:free',
            'nvidia/nemotron-3-super-120b-a12b:free'
        );

        if (!result.ok) {
            const errMsg = result.error?.error?.message || result.error?.raw || `Error al contactar el AI Coach (HTTP ${result.status})`;
            console.error('❌ OpenRouter falló:', errMsg);
            return res.status(500).json({ error: errMsg });
        }

        return res.status(200).json({ reply: result.reply ?? 'No se pudo generar respuesta.' });

    } catch (error) {
        console.error('❌ Error en ai-coach:', error);
        return res.status(500).json({ error: error?.message || 'Error interno del servidor' });
    }
}
