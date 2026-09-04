"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseNumberBR } from "@/lib/num";
import { PLAN_LIMITS, limitMessage } from "@/lib/plan";
import { notifyUser } from "@/lib/email";

export type OppState = { ok?: true; error?: string } | undefined;

function text(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function criarOportunidade(
  _prev: OppState,
  formData: FormData,
): Promise<OppState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Entre para criar uma oportunidade." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("type, plan")
    .eq("id", user.id)
    .single();
  if (profile?.type !== "company") {
    return { error: "Só empresas podem criar oportunidades." };
  }

  if (profile.plan === "free") {
    const { count } = await supabase
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("company_id", user.id)
      .eq("status", "open");
    if ((count ?? 0) >= PLAN_LIMITS.openOpportunities) {
      return { error: limitMessage("openOpportunities") };
    }
  }

  const title = text(formData.get("title"));
  if (!title) return { error: "Dê um título à oportunidade." };

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      company_id: user.id,
      title,
      budget: parseNumberBR(formData.get("budget")),
      duration_months: parseNumberBR(formData.get("duration_months")),
      region: text(formData.get("region")),
      expected_deliverables: formData
        .getAll("expected_deliverables")
        .map(String),
      description: text(formData.get("description")),
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar. Tente de novo." };

  revalidatePath("/oportunidades");
  redirect(`/oportunidades/${data.id}`);
}

export async function candidatarse(
  _prev: OppState,
  formData: FormData,
): Promise<OppState> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Entre para se candidatar." };

  const opportunityId = String(formData.get("opportunity_id") ?? "");
  if (!opportunityId) return { error: "Oportunidade inválida." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();
  if (profile?.type !== "athlete") {
    return { error: "Só pilotos podem se candidatar." };
  }

  const { error } = await supabase.from("applications").insert({
    opportunity_id: opportunityId,
    athlete_id: user.id,
    message: text(formData.get("message")),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Você já se candidatou a esta oportunidade." };
    }
    return { error: "Não foi possível enviar a candidatura." };
  }

  const { data: opp } = await supabase
    .from("opportunities")
    .select("title, company_id")
    .eq("id", opportunityId)
    .maybeSingle();
  const { data: me } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();
  if (opp) {
    after(() =>
      notifyUser(opp.company_id, {
        type: "application_received",
        subject: "Nova candidatura na sua oportunidade",
        title: `${me?.name ?? "Um piloto"} se candidatou`,
        body: `Você recebeu uma nova candidatura para "${opp.title}".`,
        cta: { label: "Ver candidatura", path: `/oportunidades/${opportunityId}` },
      }),
    );
  }

  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true };
}

export async function responderCandidatura(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) return;

  const applicationId = String(formData.get("application_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const opportunityId = String(formData.get("opportunity_id") ?? "");
  if (!applicationId || !["accepted", "rejected"].includes(decision)) return;

  // RLS já garante que só a empresa da vaga (ou o piloto) pode atualizar.
  await supabase
    .from("applications")
    .update({ status: decision as "accepted" | "rejected" })
    .eq("id", applicationId);

  if (decision === "accepted") {
    const { data: app } = await supabase
      .from("applications")
      .select("athlete_id, opportunity_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (app?.athlete_id) {
      const { data: opp } = await supabase
        .from("opportunities")
        .select("title")
        .eq("id", app.opportunity_id)
        .maybeSingle();
      const athleteId = app.athlete_id;
      after(() =>
        notifyUser(athleteId, {
          type: "application_accepted",
          subject: "Sua candidatura foi aceita",
          title: "Candidatura aceita",
          body: `A empresa aceitou sua candidatura${
            opp?.title ? ` para "${opp.title}"` : ""
          }. Você já pode enviar uma proposta.`,
          cta: {
            label: "Ver oportunidade",
            path: `/oportunidades/${opportunityId}`,
          },
        }),
      );
    }
  }

  revalidatePath(`/oportunidades/${opportunityId}`);
}

export async function alternarStatusOportunidade(
  formData: FormData,
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!user) return;

  const id = String(formData.get("opportunity_id") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!id || !["open", "closed"].includes(next)) return;

  await supabase
    .from("opportunities")
    .update({ status: next as "open" | "closed" })
    .eq("id", id)
    .eq("company_id", user.id);

  revalidatePath(`/oportunidades/${id}`);
  revalidatePath("/oportunidades");
}
