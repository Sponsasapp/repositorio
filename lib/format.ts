const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact" });
const plain = new Intl.NumberFormat("pt-BR");

export function formatBRL(v: number | null | undefined): string {
  return v == null ? "—" : brl.format(v);
}

export function formatCompact(v: number | null | undefined): string {
  return v == null ? "—" : compact.format(v);
}

export function formatNumber(v: number | null | undefined): string {
  return v == null ? "—" : plain.format(v);
}

/** Faixa de valor "R$ 1.000 – R$ 5.000" / "a partir de R$ 1.000". */
export function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min != null && max != null) return `${brl.format(min)} – ${brl.format(max)}`;
  if (min != null) return `a partir de ${brl.format(min)}`;
  if (max != null) return `até ${brl.format(max)}`;
  return null;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
