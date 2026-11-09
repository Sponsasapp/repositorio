import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service role — ignora RLS. USO RESTRITO (só servidor):
 * rotas `/api/asaas/*` (autoria já verificada) e `lib/email.ts` (resolver o
 * e-mail do destinatário depois que a RPC `notify` validou a relação).
 * Nunca importar em componente client. Instanciar por request.
 */
export function hasAdminKey(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
