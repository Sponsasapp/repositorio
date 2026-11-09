import type { PlanTier } from "@/lib/types/database.types";

export const PLAN_LIMITS = {
  /** Oportunidades abertas simultâneas (empresa). */
  openOpportunities: 1,
  /** Propostas enviadas por mês (qualquer conta). */
  proposalsPerMonth: 3,
  /** Itens na tabela de preços (piloto). */
  rateCardItems: 4,
} as const;

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  pro: "PRO",
};

export function limitMessage(kind: keyof typeof PLAN_LIMITS): string {
  switch (kind) {
    case "openOpportunities":
      return `O plano Free permite ${PLAN_LIMITS.openOpportunities} oportunidade aberta. Encerre a atual ou assine o PRO.`;
    case "proposalsPerMonth":
      return `O plano Free permite ${PLAN_LIMITS.proposalsPerMonth} propostas por mês. Assine o PRO para enviar sem limite.`;
    case "rateCardItems":
      return `O plano Free permite ${PLAN_LIMITS.rateCardItems} itens na tabela de preços. Assine o PRO para adicionar mais.`;
  }
}

/**
 * O banco também barra os limites (migration 0035, erro `plan_limit:<kind>`).
 * Converte esse erro na mensagem amigável; `null` se não for erro de limite.
 */
export function planLimitError(
  error: { message?: string } | null | undefined,
): string | null {
  const m = error?.message?.match(/plan_limit:(\w+)/);
  if (!m || !(m[1] in PLAN_LIMITS)) return null;
  return limitMessage(m[1] as keyof typeof PLAN_LIMITS);
}

/** Primeiro dia do mês corrente em ISO (para contar propostas do mês). */
export function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
