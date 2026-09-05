"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { isValidCPF, onlyDigits } from "@/lib/br";
import type { ProfileType } from "@/lib/types/database.types";

export type AuthState = { error: string } | undefined;

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Esse e-mail já tem uma conta. Tente entrar.";
  if (m.includes("password")) return "Senha inválida: use ao menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return "Não foi possível concluir. Tente novamente.";
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/dashboard";

  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traduzErro(error.message) };

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

type Kyc = {
  full_name: string;
  cpf: string;
  rg: string;
  birth: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const type = String(formData.get("type") ?? "") as ProfileType;
  const coupon = String(formData.get("coupon") ?? "")
    .trim()
    .toUpperCase();

  if (!name || !email || !password)
    return { error: "Preencha nome, e-mail e senha." };
  if (password.length < 8)
    return { error: "A senha precisa de ao menos 8 caracteres." };
  if (type !== "athlete" && type !== "company")
    return { error: "Escolha se você é piloto ou empresa." };
  if (formData.get("consent") !== "on")
    return { error: "Aceite os Termos e a Política de Privacidade para continuar." };

  // Piloto: dados pessoais obrigatórios já no cadastro.
  let kyc: Kyc | null = null;
  if (type === "athlete") {
    const g = (k: string) => String(formData.get(k) ?? "").trim();
    kyc = {
      full_name: g("full_name"),
      cpf: onlyDigits(g("cpf")),
      rg: g("rg"),
      birth: g("birth_date"),
      zip: onlyDigits(g("cep")),
      street: g("street"),
      number: g("number"),
      complement: g("complement"),
      district: g("district"),
      city: g("city"),
      state: g("uf").toUpperCase(),
    };
    if (
      !kyc.full_name ||
      !kyc.rg ||
      !kyc.birth ||
      !kyc.street ||
      !kyc.number ||
      !kyc.district ||
      !kyc.city ||
      kyc.state.length !== 2
    ) {
      return { error: "Preencha todos os dados pessoais e o endereço." };
    }
    if (!isValidCPF(kyc.cpf)) return { error: "CPF inválido." };
    if (kyc.zip.length !== 8) return { error: "CEP inválido." };
    const d = new Date(kyc.birth);
    if (isNaN(d.getTime()) || d >= new Date() || d < new Date("1920-01-01")) {
      return { error: "Data de nascimento inválida." };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Lido pelo trigger handle_new_user() para criar profile + subscription.
      data: { name, type },
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });
  if (error) {
    console.error("[signup] supabase error:", error.status, error.message);
    return { error: traduzErro(error.message) };
  }

  // E-mail já cadastrado: o Supabase devolve um "usuário fantasma" sem
  // identities (anti-enumeração), sem erro. Trata como conta existente.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { error: "Esse e-mail já tem uma conta. Tente entrar." };
  }

  // Piloto: grava os dados pessoais na tabela isolada (RPC, sem sessão ainda).
  if (kyc && data.user) {
    const { data: r } = await supabase.rpc("submit_athlete_documents", {
      p_user: data.user.id,
      p_full_name: kyc.full_name,
      p_cpf: kyc.cpf,
      p_rg: kyc.rg,
      p_birth: kyc.birth,
      p_zip: kyc.zip,
      p_street: kyc.street,
      p_number: kyc.number,
      p_complement: kyc.complement,
      p_district: kyc.district,
      p_city: kyc.city,
      p_state: kyc.state,
    });
    if (r !== "ok") {
      console.error("[signup] athlete_documents ->", JSON.stringify(r));
    }
  }

  // Cupom (opcional): aplica o PRO best-effort — nunca bloqueia o cadastro.
  let couponQS = "";
  if (coupon && data.user) {
    const r = await applyCoupon(data.user.id, coupon);
    if (r.status === "applied") {
      couponQS = `?pro=${r.months}`;
    } else {
      console.error("[signup] coupon", coupon, "->", JSON.stringify(r));
      couponQS = r.status === "config" ? "?cupom=config" : "?cupom=invalido";
    }
  }

  // Confirmação de e-mail desligada → já vem sessão, entra direto.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(`/dashboard${couponQS}`);
  }
  redirect(`/cadastro/confirme${couponQS}`);
}

type CouponResult =
  | { status: "applied"; months: number }
  | { status: "invalid"; reason: string }
  | { status: "config"; detail: string };

async function applyCoupon(
  userId: string,
  code: string,
): Promise<CouponResult> {
  // Toda a lógica (validação + resgate + PRO) roda na função redeem_coupon
  // (SECURITY DEFINER no Postgres) — não precisa da service role.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_coupon", {
    p_user: userId,
    p_code: code,
  });

  if (error) return { status: "config", detail: `rpc: ${error.message}` };

  const r = String(data ?? "?");
  if (r.startsWith("applied:")) {
    return { status: "applied", months: Number(r.split(":")[1]) || 1 };
  }
  return { status: "invalid", reason: r };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function solicitarReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  const supabase = await createClient();
  // Sucesso ou não, a resposta é a mesma (não revela se o e-mail existe).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/redefinir-senha`,
  });

  redirect("/recuperar-senha/enviado");
}

export async function redefinirSenha(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8)
    return { error: "A senha precisa de ao menos 8 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Link inválido ou expirado. Peça um novo e-mail de redefinição.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traduzErro(error.message) };

  revalidatePath("/", "layout");
  redirect("/login?redefinida=1");
}
