import type { RankTier, RankFactors } from "@/lib/types/database.types";

export const RANK_TIERS: Record<
  RankTier,
  { label: string; cls: string; badgeCls: string; order: number }
> = {
  elite: {
    label: "Elite",
    cls: "text-primary",
    badgeCls: "bg-primary text-primary-foreground",
    order: 5,
  },
  ouro: {
    label: "Ouro",
    cls: "text-accent-foreground",
    badgeCls: "bg-accent text-accent-foreground",
    order: 4,
  },
  prata: {
    label: "Prata",
    cls: "text-muted-foreground",
    badgeCls: "bg-muted text-foreground",
    order: 3,
  },
  bronze: {
    label: "Bronze",
    cls: "text-muted-foreground",
    badgeCls: "bg-muted text-muted-foreground",
    order: 2,
  },
  iniciante: {
    label: "Iniciante",
    cls: "text-muted-foreground",
    badgeCls: "bg-muted text-muted-foreground",
    order: 1,
  },
};

export const RANK_TIER_ORDER: RankTier[] = [
  "elite",
  "ouro",
  "prata",
  "bronze",
  "iniciante",
];

export function tierInfo(tier: string | null | undefined) {
  if (tier && tier in RANK_TIERS) return RANK_TIERS[tier as RankTier];
  return null;
}

export const FACTOR_LABELS: Record<keyof RankFactors, string> = {
  prazo: "Entrega no prazo",
  demanda: "Cumprimento da demanda",
  engajamento: "Engajamento",
  atividade: "Atividade de negócios",
  perfil: "Perfil completo",
  entregas_total: "Entregas avaliadas",
  entregas_no_prazo: "Entregas no prazo",
  entregas_aprovadas: "Entregas aprovadas",
};

const TIER_MULT: Record<RankTier, number> = {
  elite: 1.25,
  ouro: 1.1,
  prata: 1,
  bronze: 0.85,
  iniciante: 0.7,
};

/**
 * Faixa mensal de referência (estimativa da Sponsas) a partir de
 * alcance social, engajamento e tier. Só orientação — não é preço.
 */
export function suggestedMonthlyRange(
  followers: number,
  engagementPct: number | null,
  tier: RankTier | null,
): { min: number; max: number } | null {
  if (!followers || followers < 500) return null;
  // engajamento acima de ~8% tem retorno decrescente na estimativa
  const eng = Math.min(Math.max(engagementPct ?? 2, 1), 8);
  const mult = tier ? TIER_MULT[tier] : 1;
  const base = (followers / 1000) * eng * mult * 3;
  const min = Math.max(200, Math.round(base / 50) * 50);
  const max = Math.round((base * 1.6) / 50) * 50;
  return { min, max };
}
