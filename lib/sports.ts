/**
 * Taxonomia de esportes → modalidades.
 *
 * `value` (da modalidade) é a string gravada em `athlete_modalities.modality`
 * e usada no filtro `?modalidade=`. Só Automobilismo tem modalidades por
 * enquanto (`available: true`); os outros esportes aparecem no menu como
 * "em breve" até ganharem suas seções.
 */

export type Modality = { slug: string; label: string; value: string };
export type Sport = {
  slug: string;
  label: string;
  available: boolean;
  modalities: Modality[];
};

export const SPORTS: Sport[] = [
  {
    slug: "automobilismo",
    label: "Automobilismo",
    available: true,
    modalities: [
      { slug: "arrancada", label: "Arrancada", value: "Arrancada" },
      { slug: "kart", label: "Kart", value: "Kart" },
      { slug: "circuito", label: "Circuito", value: "Circuito" },
      { slug: "drift", label: "Drift", value: "Drift" },
    ],
  },
  { slug: "futebol", label: "Futebol", available: false, modalities: [] },
  { slug: "surf", label: "Surf", available: false, modalities: [] },
  { slug: "basquete", label: "Basquete", available: false, modalities: [] },
  { slug: "skate", label: "Skate", available: false, modalities: [] },
  { slug: "e-sports", label: "E-Sports", available: false, modalities: [] },
  { slug: "bike", label: "Bike", available: false, modalities: [] },
  {
    slug: "fisiculturismo",
    label: "Fisiculturismo",
    available: false,
    modalities: [],
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
