import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — bypassa RLS. USAR APENAS NO SERVIDOR,
 * nunca expor a chave no cliente. Retorna null se a env não estiver setada.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
