"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseNumberBR } from "@/lib/num";
import { PLAN_LIMITS, limitMessage, startOfMonthISO } from "@/lib/plan";
import { notifyUser } from "@/lib/email";
import type { ProposalPaymentType } from "@/lib/types/database.types";

export type PropostaState = { ok?: true; error?: string } | undefined;

function text(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function enviarProposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  const { supabase, user } = await ctx();
  if (!user) return { error: "Entre para enviar uma proposta." };

  const to = String(formData.get("para") ?? "");
  if (!to) return { error: "Destinatário inválido." };
  if (to === user.id) return { error: "Você não pode enviar proposta a si mesmo." };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, type, plan")
    .in("id", [user.id, to]);

  const me = profiles?.find((p) => p.id === user.id);
  const other = profiles?.find((p) => p.id === to);
  if (!me || !other) return { error: "Perfil não encontrado." };
  if (me.type === other.type) {
    return {
      error: "Propostas são entre uma empresa e um piloto.",
    };
  }

  if (me.plan === "free") {
    const { count } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("from_profile_id", user.id)
      .gte("created_at", startOfMonthISO());
    if ((count ?? 0) >= PLAN_LIMITS.proposalsPerMonth) {
      return { error: limitMessage("proposalsPerMonth") };
    }
  }

  const paymentType = String(
    formData.get("payment_type") ?? "cash",
  ) as ProposalPaymentType;
  if (!["cash", "trade", "mixed"].includes(paymentType)) {
    return { error: "Tipo de pagamento inválido." };
  }

  const value =
    paymentType === "trade" ? null : parseNumberBR(formData.get("value"));
  const tradeDescription =
    paymentType === "cash" ? null : text(formData.get("trade_description"));
  const tradeValue =
    paymentType === "cash" ? null : parseNumberBR(formData.get("trade_value"));

  if (paymentType !== "trade" && value == null) {
    return { error: "Informe o valor em dinheiro." };
  }
  if (paymentType !== "cash" && !tradeDescription) {
    return { error: "Descreva o produto ou serviço da permuta." };
  }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      from_profile_id: user.id,
      to_profile_id: to,
      opportunity_id: text(formData.get("oportunidade")),
      payment_type: paymentType,
      value,
      trade_description: tradeDescription,
      trade_value: tradeValue,
      duration_months: parseNumberBR(formData.get("duration_months")),
      deliverables: formData.getAll("deliverables").map(String),
      message: text(formData.get("message")),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível enviar a proposta." };
  }

  const { data: sender } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  after(() =>
    notifyUser(to, {
      subject: "Você recebeu uma proposta",
      title: `Proposta de ${sender?.name ?? "uma empresa"}`,
      body: "Uma nova proposta de patrocínio chegou para você. Abra para ver os termos e responder.",
      cta: { label: "Ver proposta", path: `/propostas/${data.id}` },
    }),
  );

  revalidatePath("/propostas");
  redirect(`/propostas/${data.id}`);
}

export async function responderProposta(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const id = String(formData.get("proposal_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["accepted", "rejected"].includes(decision)) return;

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  // Só o destinatário responde, e só uma vez.
  if (!proposal || proposal.to_profile_id !== user.id) return;
  if (proposal.status !== "pending") return;

  if (decision === "rejected") {
    await supabase
      .from("proposals")
      .update({ status: "rejected" })
      .eq("id", id);
    revalidatePath(`/propostas/${id}`);
    revalidatePath("/propostas");
    return;
  }

  // Aceite: descobrir quem é piloto e quem é empresa.
  const { data: parts } = await supabase
    .from("profiles")
    .select("id, type")
    .in("id", [proposal.from_profile_id, proposal.to_profile_id]);
  const athlete = parts?.find((p) => p.type === "athlete");
  const company = parts?.find((p) => p.type === "company");
  if (!athlete || !company) return;

  const { data: sponsorship, error: spErr } = await supabase
    .from("sponsorships")
    .insert({
      proposal_id: proposal.id,
      athlete_id: athlete.id,
      company_id: company.id,
      payment_type: proposal.payment_type,
      value: proposal.value,
      trade_description: proposal.trade_description,
      trade_value: proposal.trade_value,
      duration_months: proposal.duration_months,
    })
    .select("id")
    .single();

  if (spErr || !sponsorship) return;

  await supabase.from("proposals").update({ status: "accepted" }).eq("id", id);

  after(() =>
    notifyUser(proposal.from_profile_id, {
      subject: "Sua proposta foi aceita",
      title: "Proposta aceita — patrocínio criado",
      body: "A outra parte aceitou sua proposta. O patrocínio já está ativo, com os termos combinados.",
      cta: {
        label: "Ver patrocínio",
        path: `/patrocinios/${sponsorship.id}`,
      },
    }),
  );

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  revalidatePath("/patrocinios");
  redirect(`/patrocinios/${sponsorship.id}`);
}

export async function retirarProposta(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const id = String(formData.get("proposal_id") ?? "");
  if (!id) return;

  await supabase
    .from("proposals")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .eq("from_profile_id", user.id)
    .eq("status", "pending");

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
}
