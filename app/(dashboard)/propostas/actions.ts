"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseNumberBR } from "@/lib/num";
import {
  PLAN_LIMITS,
  limitMessage,
  planLimitError,
  startOfMonthISO,
} from "@/lib/plan";
import { notifyUser } from "@/lib/email";
import { flash } from "@/lib/flash";
import { canPropose } from "@/lib/participant-types";
import type { ProposalPaymentType } from "@/lib/types/database.types";

export type PropostaState = { ok?: true; error?: string } | undefined;

function text(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

type Terms = {
  payment_type: ProposalPaymentType;
  value: number | null;
  trade_description: string | null;
  trade_value: number | null;
  duration_months: number | null;
  deliverables: string[];
  message: string | null;
};

/** Lê e valida os termos do form (proposta nova e contraproposta). */
function parseTerms(formData: FormData): Terms | { error: string } {
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

  if (paymentType !== "trade" && (value == null || value <= 0)) {
    return { error: "Informe o valor em dinheiro." };
  }
  if (paymentType !== "cash" && !tradeDescription) {
    return { error: "Descreva o produto ou serviço da permuta." };
  }

  // Duração é em meses inteiros (a coluna é int — "1,5" quebrava o envio).
  const rawDuration = parseNumberBR(formData.get("duration_months"));
  const duration = rawDuration == null ? null : Math.round(rawDuration);
  if (duration != null && duration < 1) {
    return { error: "Duração precisa ser de pelo menos 1 mês." };
  }

  return {
    payment_type: paymentType,
    value,
    trade_description: tradeDescription,
    trade_value: tradeValue,
    duration_months: duration,
    deliverables: formData.getAll("deliverables").map(String),
    message: text(formData.get("message")),
  };
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
  if (!canPropose(me.type, other.type)) {
    return {
      error: "Propostas são entre uma empresa e um patrocinado.",
    };
  }

  if (me.plan === "free") {
    // Contraproposta (parent_id) não conta no limite — é negociação.
    const { count } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("from_profile_id", user.id)
      .is("parent_id", null)
      .gte("created_at", startOfMonthISO());
    if ((count ?? 0) >= PLAN_LIMITS.proposalsPerMonth) {
      return { error: limitMessage("proposalsPerMonth") };
    }
  }

  const terms = parseTerms(formData);
  if ("error" in terms) return terms;

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      from_profile_id: user.id,
      to_profile_id: to,
      opportunity_id: text(formData.get("oportunidade")),
      ...terms,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: planLimitError(error) ?? "Não foi possível enviar a proposta.",
    };
  }

  const { data: sender } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  after(() =>
    notifyUser(to, {
      type: "proposal_received",
      subject: "Você recebeu uma proposta",
      title: `Proposta de ${sender?.name ?? "uma empresa"}`,
      body: "Uma nova proposta de patrocínio chegou para você. Abra para ver os termos e responder.",
      cta: { label: "Ver proposta", path: `/propostas/${data.id}` },
    }),
  );

  revalidatePath("/propostas");
  flash(`/propostas/${data.id}`, "ok", "Proposta enviada.");
}

export async function responderProposta(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const id = String(formData.get("proposal_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["accepted", "rejected"].includes(decision)) return;

  const { data: proposal } = await supabase
    .from("proposals")
    .select("from_profile_id, to_profile_id, status")
    .eq("id", id)
    .single();
  const back = `/propostas/${id}`;
  if (!proposal || proposal.to_profile_id !== user.id) {
    flash(back, "erro", "Só quem recebeu a proposta pode responder.");
  }
  if (proposal.status !== "pending") {
    flash(back, "erro", "Esta proposta já foi respondida ou retirada.");
  }

  // Aceite/recusa passam pela RPC respond_proposal (SECURITY DEFINER):
  // é ela que cria o patrocínio e trava os termos — não dá mais pra
  // fabricar/mexer num patrocínio direto pelo client.
  const { data: result } = await supabase.rpc("respond_proposal", {
    p_proposal: id,
    p_action: decision === "accepted" ? "accept" : "reject",
  });

  if (decision === "rejected") {
    revalidatePath(back);
    revalidatePath("/propostas");
    if (result !== "ok") flash(back, "erro", "Não foi possível recusar. Tente de novo.");
    flash(back, "ok", "Proposta recusada.");
  }

  const sponsorshipId = String(result ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sponsorshipId)) {
    // não voltou um uuid → aceite falhou
    revalidatePath(back);
    flash(back, "erro", "Não foi possível aceitar a proposta. Tente de novo.");
  }

  after(() =>
    notifyUser(proposal.from_profile_id, {
      type: "proposal_accepted",
      subject: "Sua proposta foi aceita",
      title: "Proposta aceita — confirme o contrato",
      body: "A outra parte aceitou sua proposta. Falta as duas partes darem o de acordo no contrato pra valer.",
      cta: {
        label: "Ver contrato",
        path: `/patrocinios/${sponsorshipId}/contrato`,
      },
    }),
  );

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  revalidatePath("/patrocinios");
  flash(
    `/patrocinios/${sponsorshipId}`,
    "ok",
    "Proposta aceita! Agora as duas partes dão o de acordo no contrato.",
  );
}

export async function retirarProposta(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const id = String(formData.get("proposal_id") ?? "");
  if (!id) return;

  const { data: result } = await supabase.rpc("respond_proposal", {
    p_proposal: id,
    p_action: "withdraw",
  });

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  if (result !== "ok") {
    flash(`/propostas/${id}`, "erro", "Não foi possível retirar — a proposta já foi respondida?");
  }
  flash(`/propostas/${id}`, "ok", "Proposta retirada.");
}

const COUNTER_ERR: Record<string, string> = {
  no_auth: "Sua sessão expirou. Entre de novo.",
  not_pending: "Esta proposta já foi respondida, retirada ou contraproposta.",
  not_recipient: "Só quem recebeu a proposta pode fazer contraproposta.",
  bad_value: "Informe o valor em dinheiro.",
  bad_trade: "Descreva o produto ou serviço da permuta.",
};

/**
 * Contraproposta: quem recebeu devolve outros termos. Vira uma proposta nova
 * na direção oposta (parent_id → a anterior, que fica "countered"), via RPC
 * `counter_proposal` (migration 0039). Não conta no limite do plano Free.
 */
export async function contraProposta(
  _prev: PropostaState,
  formData: FormData,
): Promise<PropostaState> {
  const { supabase, user } = await ctx();
  if (!user) return { error: "Entre para responder." };

  const original = String(formData.get("contraproposta_de") ?? "");
  if (!original) return { error: "Proposta inválida." };

  const terms = parseTerms(formData);
  if ("error" in terms) return terms;

  const { data: result, error } = await supabase.rpc("counter_proposal", {
    p_proposal: original,
    p_payment_type: terms.payment_type,
    p_value: terms.value,
    p_trade_description: terms.trade_description,
    p_trade_value: terms.trade_value,
    p_duration_months: terms.duration_months,
    p_deliverables: terms.deliverables,
    p_message: terms.message,
  });

  const newId = String(result ?? "");
  if (error || !/^[0-9a-f-]{36}$/i.test(newId)) {
    return {
      error:
        COUNTER_ERR[newId] ?? "Não foi possível enviar a contraproposta.",
    };
  }

  const { data: prev } = await supabase
    .from("proposals")
    .select("from_profile_id")
    .eq("id", original)
    .maybeSingle();
  const { data: me } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  if (prev) {
    after(() =>
      notifyUser(prev.from_profile_id, {
        type: "proposal_countered",
        subject: "Você recebeu uma contraproposta",
        title: `${me?.name ?? "A outra parte"} fez uma contraproposta`,
        body: "Os termos da sua proposta voltaram com ajustes. Abra pra aceitar, recusar ou contrapropor de novo.",
        cta: { label: "Ver contraproposta", path: `/propostas/${newId}` },
      }),
    );
  }

  revalidatePath(`/propostas/${original}`);
  revalidatePath("/propostas");
  flash(`/propostas/${newId}`, "ok", "Contraproposta enviada.");
}
