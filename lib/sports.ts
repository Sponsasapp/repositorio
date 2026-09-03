/**
 * Taxonomia de esportes → modalidades.
 *
 * `value` é a string gravada em `athlete_profiles.modality` e usada no filtro
 * `?modalidade=` de /pilotos. Comece pequeno: só automobilismo por enquanto.
 */

export type Modality = { slug: string; label: string; value: string };
export type Sport = { slug: string; label: string; modalities: Modality[] };

export const SPORTS: Sport[] = [
  {
    slug: "automobilismo",
    label: "Automobilismo",
    modalities: [
      { slug: "arrancada", label: "Arrancada", value: "Arrancada" },
      { slug: "kart", label: "Kart", value: "Kart" },
      { slug: "circuito", label: "Circuito", value: "Circuito" },
      { slug: "drift", label: "Drift", value: "Drift" },
    ],
  },
];

export const MODALITIES: Modality[] = SPORTS.flatMap((s) => s.modalities);
export const MODALITY_VALUES: string[] = MODALITIES.map((m) => m.value);

export function modalityByValue(value: string | null | undefined): Modality | null {
  if (!value) return null;
  return MODALITIES.find((m) => m.value === value) ?? null;
}

export function modalityLabel(value: string | null | undefined): string {
  return modalityByValue(value)?.label ?? value ?? "";
}

/**
 * Escolhe a modalidade "principal" de um piloto: a de maior rank_score
 * (empate desfeito pela ordem da taxonomia). Usada quando a lista não está
 * filtrada por modalidade.
 */
export function pickPrimaryModality<
  T extends { modality: string; rank_score: number | null },
>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  const order = new Map(MODALITY_VALUES.map((v, i) => [v, i]));
  return [...rows].sort((a, b) => {
    const s = (b.rank_score ?? -1) - (a.rank_score ?? -1);
    if (s !== 0) return s;
    return (order.get(a.modality) ?? 99) - (order.get(b.modality) ?? 99);
  })[0];
}
