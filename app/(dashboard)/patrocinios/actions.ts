"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { loadContractTerms, termsHash } from "@/lib/contract";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { notifyUser } from "@/lib/email";
import { flash } from "@/lib/flash";

const CONTRACT_ERR: Record<string, string> = {
  no_auth: "Sua sessão expirou. Entre de novo.",
  not_found: "Patrocínio não encontrado.",
  not_party: "Você não faz parte deste patrocínio.",
  closed: "Este patrocínio já foi encerrado ou cancelado.",
  missing_legal:
    "Preencha seus dados para contrato (Meu perfil → Dados) antes de aceitar.",
  already_active:
    "As duas partes já aceitaram — o contrato vale. Pra sair, encerre o patrocínio.",
};

export type EntregaState = { ok?: true; error?: string } | undefined;

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

export async function aceitarContrato(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const id = String(formData.get("sponsorship_id") ?? "");
  const accept = String(formData.get("accept") ?? "1") === "1";
  if (!id) return;

  const contractPath = `/patrocinios/${id}/contrato`;

  // Trilha do aceite (migration 0040): IP + navegador + hash dos termos que a
  // pessoa está aceitando — recalculado aqui a partir do banco.
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const terms = accept ? await loadContractTerms(supabase, id) : null;

  const { data: result, error } = await supabase.rpc(
    "set_contract_acceptance_v2",
    {
      p_sponsorship: id,
      p_accept: accept,
      p_ip: ip,
      p_user_agent: h.get("user-agent"),
      p_terms_hash: terms ? termsHash(terms) : null,
    },
  );
  if (error || (result !== "ok" && result !== "cancelled")) {
    flash(
      contractPath,
      "erro",
      CONTRACT_ERR[String(result)] ?? "Não foi possível registrar. Tente de novo.",
    );
  }

  if (accept) {
    const { data: sp } = await supabase
      .from("sponsorships")
      .select("athlete_id, company_id, athlete_accepted_at, company_accepted_at")
      .eq("id", id)
      .maybeSingle();
    if (sp) {
      const otherId = sp.athlete_id === user.id ? sp.company_id : sp.athlete_id;
      const bothIn = !!sp.athlete_accepted_at && !!sp.company_accepted_at;
      const { data: me } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      after(() =>
        notifyUser(otherId, {
          type: bothIn ? "contract_active" : "contract_accepted",
          subject: bothIn
            ? "Contrato de acordo pelas duas partes"
            : "Aceite do contrato pendente",
          title: bothIn
            ? "Contrato ativo"
            : `${me?.name ?? "A outra parte"} aceitou o contrato`,
          body: bothIn
            ? "As duas partes deram o de acordo. O patrocínio está ativo com os termos registrados."
            : "Falta o seu aceite para o contrato valer. Abra e confirme os termos.",
          cta: { label: "Ver contrato", path: `/patrocinios/${id}/contrato` },
        }),
      );
    }
  }

  revalidatePath(`/patrocinios/${id}`);
  revalidatePath(contractPath);
  revalidatePath("/patrocinios");
  flash(
    accept ? contractPath : `/patrocinios/${id}`,
    "ok",
    accept ? "Seu de acordo foi registrado." : "Contrato cancelado.",
  );
}

export async function encerrarPatrocinio(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const id = String(formData.get("sponsorship_id") ?? "");
  if (!id) return;

  const { data: ended, error } = await supabase.rpc("end_sponsorship", {
    p_sponsorship: id,
  });
  if (error || !ended) {
    flash(`/patrocinios/${id}`, "erro", "Não foi possível encerrar o patrocínio.");
  }

  const { data: sp } = await supabase
    .from("sponsorships")
    .select("athlete_id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (sp) {
    const otherId = sp.athlete_id === user.id ? sp.company_id : sp.athlete_id;
    const { data: me } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();
    after(() =>
      notifyUser(otherId, {
        type: "sponsorship_ended",
        subject: "Patrocínio encerrado",
        title: `${me?.name ?? "A outra parte"} encerrou o patrocínio`,
        body: "O patrocínio foi marcado como encerrado na Sponsas.",
        cta: { label: "Ver patrocínio", path: `/patrocinios/${id}` },
      }),
    );
  }

  revalidatePath(`/patrocinios/${id}`);
  revalidatePath("/patrocinios");
  flash(`/patrocinios/${id}`, "ok", "Patrocínio encerrado.");
}

export async function adicionarEntrega(
  _prev: EntregaState,
  formData: FormData,
): Promise<EntregaState> {
  const { supabase, user } = await ctx();
  if (!user) return { error: "Sessão expirada." };

  const sponsorshipId = String(formData.get("sponsorship_id") ?? "");
  const type = text(formData.get("type"));
  if (!sponsorshipId || !type) return { error: "Escolha o tipo de entrega." };

  // Confirma que o usuário é parte do patrocínio.
  const { data: sp } = await supabase
    .from("sponsorships")
    .select("athlete_id, company_id")
    .eq("id", sponsorshipId)
    .maybeSingle();
  if (!sp || (sp.athlete_id !== user.id && sp.company_id !== user.id)) {
    return { error: "Patrocínio não encontrado." };
  }

  const { error } = await supabase.from("deliverables").insert({
    sponsorship_id: sponsorshipId,
    type,
    description: text(formData.get("description")),
    due_date: text(formData.get("due_date")),
  });
  if (error) return { error: "Não foi possível adicionar a entrega." };

  revalidatePath(`/patrocinios/${sponsorshipId}`);
  revalidatePath("/entregas");
  return { ok: true };
}

export async function enviarComprovacao(
  _prev: EntregaState,
  formData: FormData,
): Promise<EntregaState> {
  const { supabase, user } = await ctx();
  if (!user) return { error: "Sessão expirada." };

  const deliverableId = String(formData.get("deliverable_id") ?? "");
  const sponsorshipId = String(formData.get("sponsorship_id") ?? "");
  const url = text(formData.get("url"));
  const kind = String(formData.get("kind") ?? "link");
  if (!deliverableId || !url) return { error: "Cole o link da comprovação." };
  if (!/^https?:\/\//i.test(url)) return { error: "O link precisa começar com http." };

  const { error } = await supabase.from("deliverable_proofs").insert({
    deliverable_id: deliverableId,
    kind: ["link", "screenshot", "video"].includes(kind) ? kind : "link",
    url,
  });
  if (error) return { error: "Não foi possível enviar. Você é o piloto deste patrocínio?" };

  // O trigger proof_marks_submitted no banco leva a entrega pra "submitted".

  revalidatePath(`/patrocinios/${sponsorshipId}`);
  revalidatePath("/entregas");
  return { ok: true };
}

export async function avaliarEntrega(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const deliverableId = String(formData.get("deliverable_id") ?? "");
  const sponsorshipId = String(formData.get("sponsorship_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!deliverableId || !["approved", "rejected"].includes(decision)) return;

  // A RPC review_deliverable (SECURITY DEFINER) só deixa a EMPRESA do
  // patrocínio aprovar/recusar — o piloto não consegue mais aprovar a
  // própria entrega direto no banco.
  const back = `/patrocinios/${sponsorshipId}`;
  const { data: ok } = await supabase.rpc("review_deliverable", {
    p_deliverable: deliverableId,
    p_decision: decision,
  });
  if (!ok) {
    flash(back, "erro", "Não foi possível avaliar. Só a empresa do patrocínio avalia entregas enviadas.");
  }

  const { data: sp } = await supabase
    .from("sponsorships")
    .select("athlete_id")
    .eq("id", sponsorshipId)
    .maybeSingle();
  if (!sp) return;

  const { data: dlv } = await supabase
    .from("deliverables")
    .select("type")
    .eq("id", deliverableId)
    .maybeSingle();
  const label = dlv ? deliverableLabel(dlv.type) : "Uma entrega";
  after(() =>
    notifyUser(sp.athlete_id, {
      type: decision === "approved" ? "deliverable_approved" : "deliverable_rejected",
      subject:
        decision === "approved"
          ? "Entrega aprovada"
          : "Entrega recusada — precisa de ajuste",
      title:
        decision === "approved"
          ? `${label}: aprovada`
          : `${label}: recusada`,
      body:
        decision === "approved"
          ? "A empresa aprovou a comprovação desta entrega."
          : "A empresa pediu ajuste. Envie uma nova comprovação.",
      cta: {
        label: "Ver patrocínio",
        path: `/patrocinios/${sponsorshipId}`,
      },
    }),
  );

  revalidatePath(back);
  revalidatePath("/entregas");
  flash(back, "ok", decision === "approved" ? "Entrega aprovada." : "Entrega recusada — o patrocinado foi avisado.");
}

export async function removerEntrega(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const deliverableId = String(formData.get("deliverable_id") ?? "");
  const sponsorshipId = String(formData.get("sponsorship_id") ?? "");
  if (!deliverableId) return;

  // RLS já restringe às partes do patrocínio.
  const { error, count } = await supabase
    .from("deliverables")
    .delete({ count: "exact" })
    .eq("id", deliverableId);

  revalidatePath(`/patrocinios/${sponsorshipId}`);
  revalidatePath("/entregas");
  if (error || !count) {
    flash(`/patrocinios/${sponsorshipId}`, "erro", "Só dá pra remover entrega ainda pendente.");
  }
  flash(`/patrocinios/${sponsorshipId}`, "ok", "Entrega removida.");
}
