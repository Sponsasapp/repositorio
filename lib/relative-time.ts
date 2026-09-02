const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "hoje", "há 3 dias", "há 2 meses" a partir de um timestamp ISO. */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);

  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return rtf.format(-days, "day");
  if (days < 365) return rtf.format(-Math.floor(days / 30), "month");
  return rtf.format(-Math.floor(days / 365), "year");
}
