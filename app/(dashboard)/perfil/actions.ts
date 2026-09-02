"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/deliverables";
import { BR_UF } from "@/lib/br";

export type PerfilState = { ok?: true; error?: string } | undefined;

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function text(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function salvarPerfilPiloto(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const name = text(formData.get("name"));
  if (!name) return { error: "O nome é obrigatório." };

  const uf = text(formData.get("state"));
  if (uf && !BR_UF.includes(uf as (typeof BR_UF)[number])) {
    return { error: "Estado (UF) inválido." };
  }

  const minV = num(formData.get("desired_value_min"));
  const maxV = num(formData.get("desired_value_max"));
  if (minV !== null && maxV !== null && minV > maxV) {
    return { error: "O valor mínimo não pode ser maior que o máximo." };
  }

  // 1. profiles
  const { error: e1 } = await supabase
    .from("profiles")
    .update({
      name,
      city: text(formData.get("city")),
      state: uf,
      bio: text(formData.get("bio")),
      photo_url: text(formData.get("photo_url")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (e1) return { error: "Não foi possível salvar os dados básicos." };

  // 2. athlete_profiles (upsert)
  const { error: e2 } = await supabase.from("athlete_profiles").upsert({
    profile_id: user.id,
    modality: text(formData.get("modality")),
    category: text(formData.get("category")),
    team: text(formData.get("team")),
    car: text(formData.get("car")),
    championship: text(formData.get("championship")),
    results: text(formData.get("results")),
    desired_value_min: minV,
    desired_value_max: maxV,
    sponsor_categories: parseCsv(formData.get("sponsor_categories")),
    offered_deliverables: formData.getAll("offered_deliverables").map(String),
    availability_notes: text(formData.get("availability_notes")),
    updated_at: new Date().toISOString(),
  });
  if (e2) return { error: "Não foi possível salvar os dados esportivos." };

  // 3. social_links — substitui tudo do piloto pelas plataformas preenchidas
  const platforms = ["instagram", "tiktok", "youtube", "facebook"];
  const rows = platforms
    .map((platform) => ({
      profile_id: user.id,
      platform,
      url: text(formData.get(`social_${platform}_url`)),
      followers: num(formData.get(`social_${platform}_followers`)),
      avg_reach: num(formData.get(`social_${platform}_avg_reach`)),
      engagement_rate: num(formData.get(`social_${platform}_engagement_rate`)),
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.url || r.followers || r.avg_reach || r.engagement_rate);

  await supabase.from("social_links").delete().eq("profile_id", user.id);
  if (rows.length > 0) {
    const { error: e3 } = await supabase.from("social_links").insert(rows);
    if (e3) return { error: "Não foi possível salvar as redes sociais." };
  }

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return { ok: true };
}
