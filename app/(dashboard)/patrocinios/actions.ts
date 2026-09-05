"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { notifyUser } from "@/lib/email";

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

export async function encerrarPatrocinio(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const id = String(formData.get("sponsorship_id") ?? "");
  if (!id) return;

  await supabase.rpc("end_sponsorship", { p_sponsorship: id });

  revalidatePath(`/patrocinios/${id}`);
  revalidatePath("/patrocinios");
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
  const { data: ok } = await supabase.rpc("review_deliverable", {
    p_deliverable: deliverableId,
    p_decision: decision,
  });
  if (!ok) return;

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

  revalidatePath(`/patrocinios/${sponsorshipId}`);
  revalidatePath("/entregas");
}

export async function removerEntrega(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const deliverableId = String(formData.get("deliverable_id") ?? "");
  const sponsorshipId = String(formData.get("sponsorship_id") ?? "");
  if (!deliverableId) return;

  // RLS já restringe às partes do patrocínio.
  await supabase.from("deliverables").delete().eq("id", deliverableId);

  revalidatePath(`/patrocinios/${sponsorshipId}`);
  revalidatePath("/entregas");
}
