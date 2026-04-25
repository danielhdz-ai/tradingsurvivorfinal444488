/**
 * keep_alive.js
 * Realiza un ping a Supabase para evitar que el proyecto se pause
 * por inactividad en el plan gratuito.
 *
 * Uso local:    node scripts/keep_alive.js
 * En GitHub Actions: se ejecuta automáticamente vía cron job
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role para escribir sin restricciones RLS

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Error: Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function keepAlive() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Iniciando ping a Supabase...`);

  // 1. Upsert en la tabla keep_alive (crea o actualiza la fila con id=1)
  const { error: upsertError } = await supabase
    .from("keep_alive")
    .upsert({ id: 1, last_ping: timestamp }, { onConflict: "id" });

  if (upsertError) {
    console.error("❌ Error al escribir en keep_alive:", upsertError.message);
    process.exit(1);
  }

  // 2. Lectura de confirmación
  const { data, error: readError } = await supabase
    .from("keep_alive")
    .select("last_ping")
    .eq("id", 1)
    .single();

  if (readError) {
    console.error("❌ Error al leer keep_alive:", readError.message);
    process.exit(1);
  }

  console.log(`✅ Ping exitoso. Último registro: ${data.last_ping}`);
}

keepAlive();
