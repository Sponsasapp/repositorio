import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service role — ignora RLS. USO RESTRITO: só nas rotas
 * `/api/stripe/*` (webhook + fluxos Connect), onde a autoria já foi
 * verificada (assinatura do Stripe ou sessão do usuário). Nunca importar em
 * componente/rota comum. Instanciar por request, nunca em escopo de módulo.
 */
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
