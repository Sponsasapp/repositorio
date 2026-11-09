import type { createClient } from "@/lib/supabase/server";
import type { AthleteModality, AthletePackage } from "@/lib/types/database.types";

/**
 * Preço é informação pessoal do piloto (migration 0037): `athlete_packages.price`
 * e `athlete_modalities.desired_value_min/max` não têm SELECT público — `*`
 * nessas tabelas falha. Liste as colunas abaixo e busque os valores pelas RPCs,
 * que só devolvem algo pro próprio piloto ou pra empresa.
 */
export const PACKAGE_PUBLIC_COLS =
  "id, athlete_id, modality, title, description, position, created_at";

export const MODALITY_PUBLIC_COLS =
  "id, profile_id, modality, category, results, availability_notes, offered_deliverables, sponsor_categories, list_name, list_member, list_position, list_shark_tank, list_shark_tank_date, rank_score, rank_tier, rank_factors, rank_updated_at, created_at, updated_at";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Junta o preço em cada pacote (null se quem vê não pode ver). */
export async function withPrices(
  supabase: Supabase,
  athleteId: string,
  packages: Omit<AthletePackage, "price">[],
): Promise<AthletePackage[]> {
  const { data } = await supabase.rpc("get_athlete_prices", {
    p_athlete: athleteId,
  });
  const byId = new Map((data ?? []).map((r) => [r.package_id, r.price]));
  return packages.map((p) => ({ ...p, price: byId.get(p.id) ?? null }));
}

/** Junta a faixa de valor em cada modalidade (null se quem vê não pode ver). */
export async function withValueRanges(
  supabase: Supabase,
  athleteId: string,
  modalities: Omit<AthleteModality, "desired_value_min" | "desired_value_max">[],
): Promise<AthleteModality[]> {
  const { data } = await supabase.rpc("get_athlete_value_ranges", {
    p_athlete: athleteId,
  });
  const byMod = new Map((data ?? []).map((r) => [r.modality, r]));
  return modalities.map((m) => ({
    ...m,
    desired_value_min: byMod.get(m.modality)?.desired_value_min ?? null,
    desired_value_max: byMod.get(m.modality)?.desired_value_max ?? null,
  }));
}
