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
