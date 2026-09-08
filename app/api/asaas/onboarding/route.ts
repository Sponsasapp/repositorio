import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asaas, AsaasError, asaasConfigured } from "@/lib/asaas";

export const dynamic = "force-dynamic";

type AsaasAccount = {
  id: string;
  walletId: string;
  apiKey?: string;
};

/** Reconsulta o status da subconta no Asaas e atualiza o cache local. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("payment_accounts")
    .select("asaas_account_id, asaas_wallet_id, onboarding_status")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!row?.asaas_account_id) {
    return NextResponse.json({ status: "none", walletId: null });
  }

  try {
    // status geral da subconta (habilitada a transacionar?)
    const s = await asaas<{ commercialInfo?: string; general?: string }>(
      `/accounts/${row.asaas_account_id}`,
    );
    // Heurística até confirmar no sandbox: "APPROVED" em geral => active.
    const raw = (s.general ?? s.commercialInfo ?? "").toUpperCase();
    const status =
      raw.includes("APPROV") ? "active" : raw.includes("REJECT") ? "rejected" : "pending";
    if (status !== row.onboarding_status) {
      await admin
        .from("payment_accounts")
        .update({ onboarding_status: status, updated_at: new Date().toISOString() })
        .eq("profile_id", user.id);
    }
    return NextResponse.json({ status, walletId: row.asaas_wallet_id });
  } catch (err) {
    if (err instanceof AsaasError) {
      console.error("[asaas/onboarding GET]", err.status, err.body);
    }
    return NextResponse.json({
      status: row.onboarding_status,
      walletId: row.asaas_wallet_id,
    });
  }
}

/**
 * Cria (ou devolve) a subconta Asaas do patrocinado para ele receber via
 * split. Pré-preenche com o KYC de `athlete_documents`.
 * Fase 1: só pilotos (que já têm KYC completo). Pista/evento/mídia precisam
 * de uma etapa de KYC própria antes — ainda não existe.
 */
export async function POST() {
  if (!asaasConfigured()) {
    return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("type, name")
    .eq("id", user.id)
    .single();
  if (!profile || profile.type === "company") {
    return NextResponse.json(
      { error: "Só perfis que recebem patrocínio ativam recebimentos." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  // Já tem subconta?
  const { data: existing } = await admin
    .from("payment_accounts")
    .select("asaas_account_id, asaas_wallet_id, onboarding_status")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (existing?.asaas_account_id) {
    return NextResponse.json({
      status: existing.onboarding_status,
      walletId: existing.asaas_wallet_id,
    });
  }

  const { data: doc } = await admin
    .from("athlete_documents")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!doc) {
    return NextResponse.json(
      { error: "Complete seus dados pessoais (CPF, endereço) antes de ativar recebimentos." },
      { status: 422 },
    );
  }

  try {
    const account = await asaas<AsaasAccount>("/accounts", {
      method: "POST",
      body: {
        name: doc.full_legal_name || profile.name,
        email: user.email,
        cpfCnpj: doc.cpf,
        birthDate: doc.birth_date,
        mobilePhone: undefined,
        address: doc.address_street,
        addressNumber: doc.address_number,
        complement: doc.address_complement ?? undefined,
        province: doc.address_district,
        postalCode: doc.address_zip,
        // Asaas costuma exigir uma renda/faturamento estimado na subconta.
        // TODO: coletar de verdade; placeholder até validar no sandbox.
        incomeValue: 5000,
      },
    });

    await admin.from("payment_accounts").upsert({
      profile_id: user.id,
      asaas_account_id: account.id,
      asaas_wallet_id: account.walletId,
      onboarding_status: "pending",
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ status: "pending", walletId: account.walletId });
  } catch (err) {
    if (err instanceof AsaasError) {
      console.error("[asaas/onboarding]", err.status, err.body);
      return NextResponse.json(
        { error: "Asaas recusou o cadastro.", detail: err.body },
        { status: 502 },
      );
    }
    throw err;
  }
}
