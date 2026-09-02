"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseNumberBR } from "@/lib/num";
import { PLAN_LIMITS, limitMessage } from "@/lib/plan";
import { BR_UF } from "@/lib/br";
import { fetchYouTubeStats } from "@/lib/youtube";

export type PerfilState = { ok?: true; error?: string } | undefined;

/** Chamado pelo formulário para preencher a linha do YouTube. */
export async function buscarDadosYoutube(url: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sessão expirada." };
  return fetchYouTubeStats(url);
}

const num = (v: FormDataEntryValue | null): number | null => parseNumberBR(v);

const int = (v: FormDataEntryValue | null): number | null => {
  const n = parseNumberBR(v);
  return n == null ? null : Math.round(n);
};

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

  // Tabela de preços define a faixa de valor (resumo usado em busca/filtro).
  const pkgRows = parsePackages(formData.get("packages"), user.id);

  if (pkgRows.length > PLAN_LIMITS.rateCardItems) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    if (prof?.plan === "free") {
      return { error: limitMessage("rateCardItems") };
    }
  }
  const prices = pkgRows
    .map((p) => p.price)
    .filter((n): n is number => n != null);
  const minV = prices.length > 0 ? Math.min(...prices) : null;
  const maxV = prices.length > 0 ? Math.max(...prices) : null;

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

  const listStatus = String(formData.get("list_status") ?? "none");
  // "none" = não faz parte de nenhuma lista (sem nome de lista).
  const listName = listStatus === "none" ? null : text(formData.get("list_name"));
  // Ser membro da lista e estar no Shark Tank são estados excludentes: o Shark
  // Tank é a disputa para entrar na lista.
  const listMember = listName != null && listStatus === "member";
  const listShark = listName != null && listStatus === "shark";

  // 2. athlete_profiles (upsert)
  const { error: e2 } = await supabase.from("athlete_profiles").upsert({
    profile_id: user.id,
    modality: text(formData.get("modality")),
    category: text(formData.get("category")),
    desired_value_min: minV,
    desired_value_max: maxV,
    sponsor_categories: [
      ...new Set(
        String(formData.get("sponsor_categories") ?? "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ],
    offered_deliverables: formData.getAll("offered_deliverables").map(String),
    availability_notes: text(formData.get("availability_notes")),
    list_name: listName,
    list_member: listMember,
    list_position: listMember ? int(formData.get("list_position")) : null,
    list_shark_tank: listShark,
    list_shark_tank_date: listShark
      ? text(formData.get("list_shark_tank_date"))
      : null,
    updated_at: new Date().toISOString(),
  });
  if (e2) return { error: "Não foi possível salvar os dados esportivos." };

  // 2b. Carros (sub-perfis) + conquistas — substitui tudo.
  // As conquistas de cada carro caem via ON DELETE CASCADE; as "outras"
  // (car_id nulo) apagamos aqui junto com o resto.
  const carsParsed = parseCars(formData.get("cars"));
  const outras = parseAchievements(formData.get("outras_conquistas"));

  await supabase.from("athlete_achievements").delete().eq("athlete_id", user.id);
  await supabase.from("athlete_cars").delete().eq("athlete_id", user.id);

  let insertedCars: { id: string; position: number }[] = [];
  if (carsParsed.length > 0) {
    const { data: cd, error: eCars } = await supabase
      .from("athlete_cars")
      .insert(
        carsParsed.map((c, i) => ({
          athlete_id: user.id,
          name: c.name,
          team: c.team,
          championships: c.championships,
          photo_url: c.photo_url,
          position: i,
        })),
      )
      .select("id, position");
    if (eCars) return { error: "Não foi possível salvar os carros." };
    insertedCars = cd ?? [];
  }

  const posToId = new Map(insertedCars.map((c) => [c.position, c.id]));
  const achRows = [
    ...carsParsed.flatMap((c, i) =>
      c.conquistas.map((a, j) => ({
        athlete_id: user.id,
        car_id: posToId.get(i) ?? null,
        title: a.title,
        year: a.year,
        detail: a.detail,
        position: j,
      })),
    ),
    ...outras.map((a, j) => ({
      athlete_id: user.id,
      car_id: null as string | null,
      title: a.title,
      year: a.year,
      detail: a.detail,
      position: j,
    })),
  ];
  if (achRows.length > 0) {
    const { error: eAch } = await supabase
      .from("athlete_achievements")
      .insert(achRows);
    if (eAch) return { error: "Não foi possível salvar as conquistas." };
  }

  // 3. social_links — substitui tudo do piloto pelas plataformas preenchidas
  const platforms = ["instagram", "tiktok", "youtube", "facebook"];
  const rows = platforms
    .map((platform) => ({
      profile_id: user.id,
      platform,
      url: text(formData.get(`social_${platform}_url`)),
      followers: num(formData.get(`social_${platform}_followers`)),
      avg_reach: num(formData.get(`social_${platform}_avg_reach`)),
      avg_interactions: num(formData.get(`social_${platform}_avg_interactions`)),
      engagement_rate: num(formData.get(`social_${platform}_engagement_rate`)),
      updated_at: new Date().toISOString(),
    }))
    .filter(
      (r) =>
        r.url ||
        r.followers ||
        r.avg_reach ||
        r.avg_interactions ||
        r.engagement_rate,
    );

  // YouTube: se tem URL, puxa os números automáticos da API (sobrescreve o que
  // veio do form). Se a API falhar ou não estiver configurada, mantém o manual.
  const ytRow = rows.find((r) => r.platform === "youtube");
  if (ytRow?.url) {
    const yt = await fetchYouTubeStats(ytRow.url);
    if (yt.ok) {
      ytRow.followers = yt.data.followers ?? ytRow.followers;
      ytRow.avg_reach = yt.data.avgReach ?? ytRow.avg_reach;
      ytRow.avg_interactions = yt.data.avgInteractions ?? ytRow.avg_interactions;
      ytRow.engagement_rate = yt.data.engagementRate ?? ytRow.engagement_rate;
    }
  }

  await supabase.from("social_links").delete().eq("profile_id", user.id);
  if (rows.length > 0) {
    const { error: e3 } = await supabase.from("social_links").insert(rows);
    if (e3) return { error: "Não foi possível salvar as redes sociais." };
  }

  // 4. athlete_packages — tabela de preços (substitui tudo)
  await supabase.from("athlete_packages").delete().eq("athlete_id", user.id);
  if (pkgRows.length > 0) {
    const { error: e4 } = await supabase
      .from("athlete_packages")
      .insert(pkgRows);
    if (e4) return { error: "Não foi possível salvar a tabela de preços." };
  }

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  revalidatePath(`/p/${user.id}`);
  return { ok: true };
}

function parsePackages(raw: FormDataEntryValue | null, athleteId: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((p, i) => {
      const item = p as Record<string, unknown>;
      const title = String(item.title ?? "").trim();
      const description = String(item.description ?? "").trim();
      const priceNum = parseNumberBR(item.price);
      return {
        athlete_id: athleteId,
        title,
        description: description || null,
        price: priceNum != null && priceNum > 0 ? priceNum : null,
        position: i,
      };
    })
    .filter((p) => p.title.length > 0);
}

type AchInput = { title: string; year: string | null; detail: string | null };

function parseAchList(raw: unknown): AchInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => {
      const item = a as Record<string, unknown>;
      return {
        title: String(item.title ?? "").trim(),
        year: String(item.year ?? "").trim() || null,
        detail: String(item.detail ?? "").trim() || null,
      };
    })
    .filter((a) => a.title.length > 0);
}

function parseCars(raw: FormDataEntryValue | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((c) => {
      const item = c as Record<string, unknown>;
      return {
        name: String(item.name ?? "").trim(),
        team: String(item.team ?? "").trim() || null,
        championships: String(item.championships ?? "").trim() || null,
        photo_url: String(item.photo_url ?? "").trim() || null,
        conquistas: parseAchList(item.conquistas),
      };
    })
    .filter((c) => c.name.length > 0);
}

function parseAchievements(raw: FormDataEntryValue | null): AchInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
  return parseAchList(parsed);
}

export async function salvarPerfilEmpresa(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const name = text(formData.get("name"));
  if (!name) return { error: "O nome da empresa é obrigatório." };

  const uf = text(formData.get("state"));
  if (uf && !BR_UF.includes(uf as (typeof BR_UF)[number])) {
    return { error: "Estado (UF) inválido." };
  }

  const { error: e1 } = await supabase
    .from("profiles")
    .update({
      name,
      city: text(formData.get("city")),
      state: uf,
      photo_url: text(formData.get("photo_url")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (e1) return { error: "Não foi possível salvar os dados da empresa." };

  const { error: e2 } = await supabase.from("company_profiles").upsert({
    profile_id: user.id,
    segment: text(formData.get("segment")),
    website: text(formData.get("website")),
    instagram: text(formData.get("instagram")),
    description: text(formData.get("description")),
    campaign_goal: text(formData.get("campaign_goal")),
    target_audience: text(formData.get("target_audience")),
    budget: num(formData.get("budget")),
    campaign_duration_months: num(formData.get("campaign_duration_months")),
    region_of_interest: text(formData.get("region_of_interest")),
    updated_at: new Date().toISOString(),
  });
  if (e2) return { error: "Não foi possível salvar os dados da campanha." };

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return { ok: true };
}
