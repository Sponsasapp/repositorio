/** Regiões do Brasil e suas UFs. */
export const BR_REGIONS: Record<string, string[]> = {
  Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MT", "MS"],
  Sudeste: ["ES", "MG", "RJ", "SP"],
  Sul: ["PR", "RS", "SC"],
};

export function regionOfUf(uf: string | null | undefined): string | null {
  if (!uf) return null;
  const u = uf.trim().toUpperCase();
  for (const [region, ufs] of Object.entries(BR_REGIONS)) {
    if (ufs.includes(u)) return region;
  }
  return null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/-/g, " ");

/**
 * O piloto (uf) está na zona de atuação descrita em `regionText`?
 * `regionText` é texto livre: "Sudeste", "Sul e Sudeste", "Nacional", "SP",
 * "MG/RJ"...
 * Retorna `null` quando não dá pra decidir (sem UF do piloto, ou campanha sem
 * região definida = sem filtro).
 */
export function matchesCampaignRegion(
  uf: string | null | undefined,
  regionText: string | null | undefined,
): boolean | null {
  const raw = (regionText ?? "").trim();
  if (!raw || !uf) return null;

  const t = norm(raw);
  if (
    /\b(nacional|nacionais|brasil|todo o pais|todo pais|todas as regioes|pais inteiro)\b/.test(
      t,
    )
  ) {
    return true;
  }

  const u = uf.trim().toLowerCase();
  if (new RegExp(`\\b${u}\\b`).test(t)) return true;

  const region = regionOfUf(uf);
  if (region && new RegExp(`\\b${norm(region)}\\b`).test(t)) return true;

  return false;
}
