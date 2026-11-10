import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  asaas,
  AsaasError,
  asaasConfigured,
  asaasErrorMessage,
  subaccountStatus,
} from "@/lib/asaas";
import { onlyDigits } from "@/lib/br";
import { parseNumberBR } from "@/lib/num";

export const dynamic = "force-dynamic";

const COMPANY_TYPES = ["MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION"] as const;

type AsaasAccount = { id: string; walletId: string; apiKey: string };

/** Reconsulta o status da subconta no Asaas e atualiza o cache local. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!asaasConfigured()) return NextResponse.json({ status: "none" });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("payment_accounts")
    .select("asaas_api_key, onboarding_status, onboarding_url")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!row?.asaas_api_key) return NextResponse.json({ status: "none" });

  try {
    const { status, onboardingUrl } = await subaccountStatus(row.asaas_api_key);
    await admin
      .from("payment_accounts")
      .update({
        onboarding_status: status,
        onboarding_url: onboardingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", user.id);
    return NextResponse.json({ status, onboardingUrl });
  } catch (err) {
    if (err instanceof AsaasError) console.error("[asaas/onboarding GET]", err.status);
    return NextResponse.json({
      status: row.onboarding_status,
      onboardingUrl: row.onboarding_url,
    });
  }
}

/**
 * Cria a subconta Asaas do patrocinado (recebe via split). Dados vêm de
 * "Dados para contrato" (athlete_documents do piloto ou party_legal_info de
 * pista/evento/mídia) + o que o form pede aqui: celular, renda/faturamento,
 * tipo de empresa (CNPJ) ou nascimento (CPF de não-piloto).
 */
export async function POST(request: Request) {
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

  let input: Record<string, unknown> = {};
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    // corpo vazio → validação abaixo acusa
  }
  const phone = onlyDigits(String(input.mobilePhone ?? ""));
  const income = parseNumberBR(String(input.incomeValue ?? ""));
  if (phone.length < 10 || phone.length > 11) {
    return NextResponse.json({ error: "Celular inválido (DDD + número)." }, { status: 422 });
  }
  if (income == null || income <= 0) {
    return NextResponse.json(
      { error: "Informe sua renda ou faturamento mensal aproximado." },
      { status: 422 },
    );
  }

  const admin = createAdminClient();

  // Já tem subconta? Não cria outra (antes cada clique criava uma nova).
  const { data: existing } = await admin
    .from("payment_accounts")
    .select("asaas_account_id, onboarding_status, onboarding_url")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (existing?.asaas_account_id) {
    return NextResponse.json({
      status: existing.onboarding_status,
      onboardingUrl: existing.onboarding_url,
    });
  }

  // Monta o cadastro a partir dos "Dados para contrato".
  let body: Record<string, unknown>;
  if (profile.type === "athlete") {
    const { data: doc } = await admin
      .from("athlete_documents")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!doc) {
      return NextResponse.json(
        { error: "Preencha seus dados pessoais (Meu perfil → Dados) antes." },
        { status: 422 },
      );
    }
    body = {
      name: doc.full_legal_name || profile.name,
      cpfCnpj: doc.cpf,
      birthDate: doc.birth_date,
      address: doc.address_street,
      addressNumber: doc.address_number,
      complement: doc.address_complement ?? undefined,
      province: doc.address_district,
      postalCode: doc.address_zip,
    };
  } else {
    const { data: legal } = await admin
      .from("party_legal_info")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!legal) {
      return NextResponse.json(
        { error: "Preencha seus dados para contrato (Meu perfil → Dados) antes." },
        { status: 422 },
      );
    }
    const isCnpj = legal.document.length === 14;
    body = {
      name: legal.legal_name,
      cpfCnpj: legal.document,
      address: legal.address_street,
      addressNumber: legal.address_number,
      complement: legal.address_complement ?? undefined,
      province: legal.address_district,
      postalCode: legal.address_zip,
    };
    if (isCnpj) {
      const ct = String(input.companyType ?? "");
      if (!COMPANY_TYPES.includes(ct as (typeof COMPANY_TYPES)[number])) {
        return NextResponse.json({ error: "Escolha o tipo de empresa." }, { status: 422 });
      }
      body.companyType = ct;
    } else {
      const bd = String(input.birthDate ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bd)) {
        return NextResponse.json({ error: "Informe a data de nascimento." }, { status: 422 });
      }
      body.birthDate = bd;
    }
  }

  try {
    const account = await asaas<AsaasAccount>("/accounts", {
      method: "POST",
      body: {
        ...body,
        email: user.email,
        mobilePhone: phone,
        incomeValue: income,
      },
    });

    const { status, onboardingUrl } = await subaccountStatus(account.apiKey).catch(
      () => ({ status: "pending" as const, onboardingUrl: null }),
    );

    const { error: saveErr } = await admin.from("payment_accounts").upsert({
      profile_id: user.id,
      asaas_account_id: account.id,
      asaas_wallet_id: account.walletId,
      asaas_api_key: account.apiKey,
      onboarding_status: status,
      onboarding_url: onboardingUrl,
      updated_at: new Date().toISOString(),
    });
    if (saveErr) {
      // Subconta criada no Asaas mas não gravada aqui: loga pra conciliar.
      console.error("[asaas/onboarding] save failed for", user.id, account.id, saveErr.message);
      return NextResponse.json(
        { error: "Cadastro criado no Asaas, mas não consegui salvar. Fale com a gente." },
        { status: 500 },
      );
    }

    return NextResponse.json({ status, onboardingUrl });
  } catch (err) {
    if (err instanceof AsaasError) {
      console.error("[asaas/onboarding]", err.status, err.body);
      return NextResponse.json(
        { error: asaasErrorMessage(err) ?? "O Asaas recusou o cadastro." },
        { status: 502 },
      );
    }
    throw err;
  }
}
