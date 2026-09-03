"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
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

  // Cupom (opcional): aplica o PRO best-effort — nunca bloqueia o cadastro.
  let couponQS = "";
  if (coupon && data.user) {
    const r = await applyCoupon(data.user.id, coupon);
    if (r.status === "applied") couponQS = `?pro=${r.months}`;
    else couponQS = "?cupom=invalido";
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
  | { status: "invalid" }
  | { status: "error" };

async function applyCoupon(
  userId: string,
  code: string,
): Promise<CouponResult> {
  const admin = createAdminClient();
  if (!admin) return { status: "error" };

  const { data: coupon } = await admin
    .from("coupons")
    .select("id, plan_months, max_uses, uses, active, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (
    !coupon ||
    !coupon.active ||
    (coupon.expires_at && new Date(coupon.expires_at) < new Date()) ||
    (coupon.max_uses != null && coupon.uses >= coupon.max_uses)
  ) {
    return { status: "invalid" };
  }

  // PK (coupon_id, profile_id) evita resgate duplicado.
  const { error: rErr } = await admin
    .from("coupon_redemptions")
    .insert({ coupon_id: coupon.id, profile_id: userId });
  if (rErr) return { status: "invalid" };

  const until = new Date();
  until.setMonth(until.getMonth() + coupon.plan_months);

  // upsert: a linha normalmente já existe (trigger handle_new_user), mas se
  // faltar por algum motivo, cria.
  const { error: sErr } = await admin.from("subscriptions").upsert(
    {
      profile_id: userId,
      plan: "pro",
      status: "active",
      renewed_until: until.toISOString(),
    },
    { onConflict: "profile_id" },
  );
  if (sErr) return { status: "error" };

  await admin
    .from("coupons")
    .update({ uses: coupon.uses + 1 })
    .eq("id", coupon.id);

  return { status: "applied", months: coupon.plan_months };
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
