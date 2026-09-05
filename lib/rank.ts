import type {
  RankTier,
  RankFactors,
  RankConfig,
} from "@/lib/types/database.types";

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

/** Rótulos das linhas de pontos que somam no rank (não conta as `qt_*`). */
export const POINT_LABELS: Partial<Record<keyof RankFactors, string>> = {
  entregas_prazo: "Entregas no prazo",
  entregas_aprovadas: "Entregas aprovadas (fora do prazo)",
  patrocinios: "Patrocínios ativos",
  concluidos: "Patrocínios concluídos",
  perfil: "Perfil completo",
  engajamento: "Engajamento",
  penalidades: "Penalidades",
};

/** Fallback caso a linha de rank_config não seja carregada. */
export const DEFAULT_RANK_CONFIG: RankConfig = {
  id: true,
  pts_entrega_prazo: 20,
  pts_entrega_aprovada: 8,
  pts_patrocinio_fechado: 40,
  pts_patrocinio_concluido: 30,
  pts_perfil_completo: 15,
  pts_engajamento_max: 30,
  pts_penalidade_entrega: 10,
  tier_bronze: 60,
  tier_prata: 180,
  tier_ouro: 400,
  tier_elite: 750,
};

function tierThresholds(cfg: RankConfig): Record<RankTier, number> {
  return {
    iniciante: 0,
    bronze: cfg.tier_bronze,
    prata: cfg.tier_prata,
    ouro: cfg.tier_ouro,
    elite: cfg.tier_elite,
  };
}

export function tierFromPoints(points: number, cfg: RankConfig): RankTier {
  if (points >= cfg.tier_elite) return "elite";
  if (points >= cfg.tier_ouro) return "ouro";
  if (points >= cfg.tier_prata) return "prata";
  if (points >= cfg.tier_bronze) return "bronze";
  return "iniciante";
}

/**
 * Progresso do piloto dentro do tier atual — barra + quanto falta pro
 * próximo. Como os limiares são crescentes, subir de tier fica mais caro.
 */
export function tierProgress(
  points: number,
  cfg: RankConfig,
): {
  tier: RankTier;
  nextTier: RankTier | null;
  currentAt: number;
  nextAt: number | null;
  toNext: number;
  pct: number;
} {
  const th = tierThresholds(cfg);
  const tier = tierFromPoints(points, cfg);
  const order: RankTier[] = ["iniciante", "bronze", "prata", "ouro", "elite"];
  const idx = order.indexOf(tier);
  const nextTier = idx < order.length - 1 ? order[idx + 1] : null;
  const currentAt = th[tier];
  const nextAt = nextTier ? th[nextTier] : null;
  const toNext = nextAt != null ? Math.max(0, nextAt - points) : 0;
  const pct =
    nextAt != null && nextAt > currentAt
      ? Math.min(100, Math.round(((points - currentAt) / (nextAt - currentAt)) * 100))
      : 100;
  return { tier, nextTier, currentAt, nextAt, toNext, pct };
}

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
