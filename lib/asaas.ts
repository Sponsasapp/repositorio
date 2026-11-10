/**
 * Cliente REST do Asaas (lado do servidor). Só nas rotas /api/asaas/*.
 *
 * Env:
 *  - ASAAS_API_KEY     chave da conta principal (obrigatória)
 *  - ASAAS_API_BASE    override da base; default = sandbox
 *  - ASAAS_WEBHOOK_TOKEN  token do header asaas-access-token nos webhooks
 */
const DEFAULT_BASE = "https://api-sandbox.asaas.com/v3";

export function asaasConfigured(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

function base(): string {
  return (process.env.ASAAS_API_BASE ?? DEFAULT_BASE).replace(/\/+$/, "");
}

export class AsaasError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Asaas ${status}: ${JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * Chamada REST. `apiKey` opcional = chave de uma SUBCONTA (status e
 * documentos da subconta só respondem com a chave dela).
 */
export async function asaas<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
  apiKey?: string,
): Promise<T> {
  const key = apiKey ?? process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada.");

  const res = await fetch(`${base()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      "User-Agent": "Sponsas",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new AsaasError(res.status, data);
  return data as T;
}

/** Mensagem legível do erro do Asaas (primeira `description`). */
export function asaasErrorMessage(err: unknown): string | null {
  if (!(err instanceof AsaasError)) return null;
  const b = err.body as { errors?: { description?: string }[] } | null;
  return b?.errors?.[0]?.description ?? null;
}

export type OnboardingStatus = "none" | "pending" | "active" | "rejected";

/**
 * Status real da subconta (GET /myAccount/status com a chave dela) + link
 * de envio de documentos, se o Asaas ainda pedir algum.
 */
export async function subaccountStatus(
  subApiKey: string,
): Promise<{ status: OnboardingStatus; onboardingUrl: string | null }> {
  const s = await asaas<{ general?: string }>("/myAccount/status", {}, subApiKey);
  const g = (s.general ?? "").toUpperCase();
  const status: OnboardingStatus =
    g === "APPROVED" ? "active" : g === "REJECTED" ? "rejected" : "pending";

  let onboardingUrl: string | null = null;
  if (status !== "active") {
    try {
      const d = await asaas<{
        data?: { status?: string; onboardingUrl?: string | null }[];
      }>("/myAccount/documents", {}, subApiKey);
      onboardingUrl =
        d.data?.find((x) => x.status !== "APPROVED" && x.onboardingUrl)
          ?.onboardingUrl ?? null;
    } catch {
      // sem link agora — a pessoa tenta "Atualizar status" depois
    }
  }
  return { status, onboardingUrl };
}
