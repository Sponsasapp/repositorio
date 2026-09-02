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

type Terms = {
  payment_type: "cash" | "trade" | "mixed";
  value: number | null;
  trade_description: string | null;
  trade_value: number | null;
};

/** Resumo dos termos: "R$ 2.000/mês", "Permuta: 4 pneus (R$ 3.200)", "R$ 1.000/mês + permuta". */
export function paymentSummary(t: Terms): string {
  const cash = t.value != null ? `${brl.format(t.value)}/mês` : null;
  const trade =
    t.trade_description != null
      ? `Permuta: ${t.trade_description}${
          t.trade_value != null ? ` (${brl.format(t.trade_value)})` : ""
        }`
      : null;

  if (t.payment_type === "cash") return cash ?? "A combinar";
  if (t.payment_type === "trade") return trade ?? "Permuta";
  return [cash, trade].filter(Boolean).join(" + ") || "A combinar";
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
