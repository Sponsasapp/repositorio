import { createAdminClient } from "@/lib/supabase/admin";
import { asaas, asaasConfigured, asaasErrorMessage } from "@/lib/asaas";
import { todayISO } from "@/lib/calendar";

/**
 * Cobrança do patrocínio via Asaas (servidor). Empresa = customer; cada
 * patrocínio com valor em dinheiro vira uma assinatura mensal com split:
 * (100 − taxa Sponsas)% vai pro walletId do patrocinado.
 *
 * Tudo aqui usa service role — chamar SÓ depois de checar que o usuário é
 * parte do patrocínio.
 */

export type Invoice = {
  id: string;
  dueDate: string;
  value: number;
  status: string; // PENDING | RECEIVED | CONFIRMED | OVERDUE | ...
  invoiceUrl: string | null;
};

export const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Em aberto", cls: "bg-muted text-muted-foreground" },
  OVERDUE: { label: "Vencida", cls: "bg-destructive/10 text-destructive" },
  RECEIVED: { label: "Paga", cls: "bg-success-soft text-success" },
  CONFIRMED: { label: "Paga", cls: "bg-success-soft text-success" },
  RECEIVED_IN_CASH: { label: "Paga", cls: "bg-success-soft text-success" },
  REFUNDED: { label: "Estornada", cls: "bg-muted text-muted-foreground" },
};

type SponsorshipForBilling = {
  id: string;
  athlete_id: string;
  company_id: string;
  status: string;
  payment_type: string;
  value: number | null;
  duration_months: number | null;
  start_date: string;
  athlete_accepted_at: string | null;
  company_accepted_at: string | null;
  asaas_subscription_id: string | null;
};

/** O que falta pra empresa poder ativar a cobrança (null = pode). */
export async function billingBlocker(
  s: SponsorshipForBilling,
): Promise<string | null> {
  if (!asaasConfigured()) return "Pagamentos pela Sponsas ainda não estão ligados.";
  if (s.asaas_subscription_id) return null;
  if (s.status !== "active") return "Patrocínio não está ativo.";
  if (!s.athlete_accepted_at || !s.company_accepted_at) {
    return "O contrato precisa do aceite das duas partes.";
  }
  if (s.payment_type === "trade" || !s.value || s.value <= 0) {
    return "Este patrocínio é só permuta — não há cobrança em dinheiro.";
  }
  const admin = createAdminClient();
  const [{ data: sponseeAcct }, { data: legal }] = await Promise.all([
    admin
      .from("payment_accounts")
      .select("onboarding_status, asaas_wallet_id")
      .eq("profile_id", s.athlete_id)
      .maybeSingle(),
    admin
      .from("party_legal_info")
      .select("profile_id")
      .eq("profile_id", s.company_id)
      .maybeSingle(),
  ]);
  if (!sponseeAcct?.asaas_wallet_id || sponseeAcct.onboarding_status !== "active") {
    return "Aguardando o patrocinado ativar os recebimentos (Configurações → Recebimentos).";
  }
  if (!legal) return "Preencha os dados para contrato da empresa.";
  return null;
}

/** Garante o customer Asaas da empresa (cria na 1ª vez). */
async function ensureCustomer(companyId: string, email: string | null) {
  const admin = createAdminClient();
  const { data: acct } = await admin
    .from("payment_accounts")
    .select("asaas_customer_id")
    .eq("profile_id", companyId)
    .maybeSingle();
  if (acct?.asaas_customer_id) return acct.asaas_customer_id as string;

  const { data: legal } = await admin
    .from("party_legal_info")
    .select("*")
    .eq("profile_id", companyId)
    .single();
  const customer = await asaas<{ id: string }>("/customers", {
    method: "POST",
    body: {
      name: legal.legal_name,
      cpfCnpj: legal.document,
      email: email ?? undefined,
      address: legal.address_street,
      addressNumber: legal.address_number,
      complement: legal.address_complement ?? undefined,
      province: legal.address_district,
      postalCode: legal.address_zip,
      externalReference: companyId,
      notificationDisabled: false,
    },
  });
  await admin.from("payment_accounts").upsert({
    profile_id: companyId,
    asaas_customer_id: customer.id,
    updated_at: new Date().toISOString(),
  });
  return customer.id;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Cria a assinatura mensal do patrocínio no Asaas, com split pro
 * patrocinado. Devolve null em sucesso ou a mensagem de erro.
 */
export async function createSponsorshipSubscription(
  s: SponsorshipForBilling & { sponseeName: string | null },
  companyEmail: string | null,
): Promise<string | null> {
  const blocker = await billingBlocker(s);
  if (blocker) return blocker;
  if (s.asaas_subscription_id) return null;

  const admin = createAdminClient();
  const [{ data: sponseeAcct }, { data: cfg }] = await Promise.all([
    admin
      .from("payment_accounts")
      .select("asaas_wallet_id")
      .eq("profile_id", s.athlete_id)
      .single(),
    admin.from("plan_config").select("platform_fee_pct").limit(1).maybeSingle(),
  ]);
  const fee = Number(cfg?.platform_fee_pct ?? 10);

  try {
    const customerId = await ensureCustomer(s.company_id, companyEmail);
    // 1º vencimento: o início do contrato, mas nunca antes de 3 dias.
    const minDue = addDays(todayISO(), 3);
    const nextDueDate = s.start_date > minDue ? s.start_date : minDue;

    const sub = await asaas<{ id: string }>("/subscriptions", {
      method: "POST",
      body: {
        customer: customerId,
        billingType: "UNDEFINED", // a empresa escolhe: PIX, boleto ou cartão
        value: s.value,
        nextDueDate,
        cycle: "MONTHLY",
        description: `Patrocínio Sponsas — ${s.sponseeName ?? "patrocinado"}`,
        ...(s.duration_months
          ? {
              maxPayments: s.duration_months,
              endDate: addMonths(nextDueDate, s.duration_months - 1),
            }
          : {}),
        externalReference: s.id,
        split: [
          {
            walletId: sponseeAcct?.asaas_wallet_id,
            percentualValue: Math.max(0, Math.min(100, 100 - fee)),
          },
        ],
      },
    });

    const { error } = await admin
      .from("sponsorships")
      .update({ asaas_subscription_id: sub.id, payment_status: "active" })
      .eq("id", s.id);
    if (error) {
      console.error("[payments] subscription saved in Asaas but not locally", s.id, sub.id);
      return "Cobrança criada no Asaas, mas não consegui salvar. Fale com a gente.";
    }
    return null;
  } catch (err) {
    console.error("[payments] create subscription", err);
    return asaasErrorMessage(err) ?? "Não foi possível criar a cobrança agora.";
  }
}

/** Faturas da assinatura (as 12 mais recentes primeiro). */
export async function listInvoices(subscriptionId: string): Promise<Invoice[]> {
  try {
    const r = await asaas<{
      data: {
        id: string;
        dueDate: string;
        value: number;
        status: string;
        invoiceUrl?: string | null;
      }[];
    }>(`/subscriptions/${subscriptionId}/payments?limit=12`);
    return (r.data ?? [])
      .map((p) => ({
        id: p.id,
        dueDate: p.dueDate,
        value: p.value,
        status: p.status,
        invoiceUrl: p.invoiceUrl ?? null,
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  } catch (err) {
    console.error("[payments] list invoices", err);
    return [];
  }
}
