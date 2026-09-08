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

export async function asaas<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
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
