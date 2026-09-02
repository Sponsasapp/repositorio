"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Apenas em desenvolvimento: alterna o plano da própria conta para
 * testar os limites. Em produção o upgrade é manual (sem gateway no MVP).
 */
export async function alternarPlanoTeste(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("profile_id", user.id)
    .maybeSingle();

  const next = sub?.plan === "pro" ? "free" : "pro";
  await supabase
    .from("subscriptions")
    .update({ plan: next })
    .eq("profile_id", user.id);

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  revalidatePath("/pilotos");
}
