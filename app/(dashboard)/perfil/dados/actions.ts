"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidCPF, onlyDigits } from "@/lib/br";

export type DadosState = { ok?: true; error?: string } | undefined;

export async function salvarDadosPessoais(
  _prev: DadosState,
  formData: FormData,
): Promise<DadosState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const cpf = onlyDigits(g("cpf"));
  const zip = onlyDigits(g("cep"));
  const birth = g("birth_date");
  const state = g("uf").toUpperCase();

  if (
    !g("full_name") ||
    !g("rg") ||
    !birth ||
    !g("street") ||
    !g("number") ||
    !g("district") ||
    !g("city") ||
    state.length !== 2
  ) {
    return { error: "Preencha todos os campos obrigatórios." };
  }
  if (!isValidCPF(cpf)) return { error: "CPF inválido." };
  if (zip.length !== 8) return { error: "CEP inválido." };
  const d = new Date(birth);
  if (isNaN(d.getTime()) || d >= new Date() || d < new Date("1920-01-01")) {
    return { error: "Data de nascimento inválida." };
  }

  const { data: r } = await supabase.rpc("submit_athlete_documents", {
    p_user: user.id,
    p_full_name: g("full_name"),
    p_cpf: cpf,
    p_rg: g("rg"),
    p_birth: birth,
    p_zip: zip,
    p_street: g("street"),
    p_number: g("number"),
    p_complement: g("complement"),
    p_district: g("district"),
    p_city: g("city"),
    p_state: state,
  });
  if (r !== "ok") return { error: "Não foi possível salvar. Confira os dados." };

  revalidatePath("/perfil/dados");
  revalidatePath("/dashboard");
  return { ok: true };
}
