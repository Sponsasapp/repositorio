"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  // RLS: só as partes do patrocínio conseguem atualizar.
  await supabase
    .from("sponsorships")
    .update({ status: "ended" })
    .eq("id", id)
    .eq("status", "active");

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

  // Marca a entrega como enviada para revisão.
  await supabase
    .from("deliverables")
    .update({ status: "submitted" })
    .eq("id", deliverableId);

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

  // Só a empresa do patrocínio aprova/rejeita.
  const { data: sp } = await supabase
    .from("sponsorships")
    .select("company_id")
    .eq("id", sponsorshipId)
    .maybeSingle();
  if (!sp || sp.company_id !== user.id) return;

  await supabase
    .from("deliverables")
    .update({ status: decision as "approved" | "rejected" })
    .eq("id", deliverableId);

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
