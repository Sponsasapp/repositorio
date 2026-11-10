"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentOnboardingStatus } from "@/lib/types/database.types";

const COPY: Record<
  PaymentOnboardingStatus,
  { label: string; hint: string; tone: string }
> = {
  none: {
    label: "Não ativado",
    hint: "Ative pra receber os patrocínios direto na sua conta, com repasse automático a cada pagamento da marca.",
    tone: "text-muted-foreground",
  },
  pending: {
    label: "Em análise",
    hint: "O Asaas (nosso parceiro de pagamentos) está verificando seus dados. Se pedir documentos, envie pelo link abaixo.",
    tone: "text-primary",
  },
  active: {
    label: "Ativo",
    hint: "Tudo certo — você já recebe patrocínios pela Sponsas.",
    tone: "text-success",
  },
  rejected: {
    label: "Recusado",
    hint: "O Asaas não aprovou o cadastro. Fale com a gente pra entender o motivo.",
    tone: "text-destructive",
  },
};

const COMPANY_TYPES = [
  { value: "MEI", label: "MEI" },
  { value: "LIMITED", label: "Ltda / sociedade limitada" },
  { value: "INDIVIDUAL", label: "Empresário individual (EI)" },
  { value: "ASSOCIATION", label: "Associação" },
];

/**
 * `docKind`: de onde vêm os dados do cadastro no Asaas —
 * athlete (dados pessoais do piloto), cnpj / cpf (dados para contrato de
 * pista/evento/mídia) ou missing (ainda não preencheu).
 */
export function RecebimentosCard({
  status,
  hasAccount,
  onboardingUrl,
  docKind,
  configured,
}: {
  status: PaymentOnboardingStatus;
  hasAccount: boolean;
  onboardingUrl: string | null;
  docKind: "athlete" | "cnpj" | "cpf" | "missing";
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = COPY[status];

  async function activate(form: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/asaas/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível ativar agora.");
        return;
      }
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/asaas/onboarding");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-border bg-card mt-6 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl">Recebimentos</h2>
        {configured && (
          <span
            className={`flex items-center gap-1.5 text-sm font-medium ${c.tone}`}
          >
            {status === "active" && (
              <span className="bg-success/15 text-success flex size-4 items-center justify-center rounded-full">
                <CheckIcon className="size-2.5" strokeWidth={3} />
              </span>
            )}
            {c.label}
          </span>
        )}
      </div>

      {!configured ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Em breve: receber os patrocínios pela Sponsas, com repasse automático.
          Por enquanto o pagamento é combinado direto com a marca.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground mt-2 text-sm">{c.hint}</p>

          {status === "none" && docKind === "missing" && (
            <div className="mt-4 text-sm">
              <p>Primeiro preencha seus dados para contrato.</p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/perfil/dados">Preencher dados</Link>
              </Button>
            </div>
          )}

          {status === "none" && docKind !== "missing" && (
            <form action={activate} className="mt-4 flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">
                Nome, documento e endereço vêm dos seus dados para contrato.
                Falta só:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mobilePhone" className="text-xs">
                    Celular (com DDD)
                  </Label>
                  <Input
                    id="mobilePhone"
                    name="mobilePhone"
                    inputMode="tel"
                    placeholder="(15) 99123-4567"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="incomeValue" className="text-xs">
                    {docKind === "cnpj"
                      ? "Faturamento mensal aproximado (R$)"
                      : "Renda mensal aproximada (R$)"}
                  </Label>
                  <Input
                    id="incomeValue"
                    name="incomeValue"
                    inputMode="numeric"
                    placeholder="3000"
                    required
                  />
                </div>
                {docKind === "cnpj" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="companyType" className="text-xs">
                      Tipo de empresa
                    </Label>
                    <select
                      id="companyType"
                      name="companyType"
                      required
                      defaultValue=""
                      className="border-input bg-card h-9 w-full rounded-lg border px-2 text-sm"
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {COMPANY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {docKind === "cpf" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="birthDate" className="text-xs">
                      Data de nascimento
                    </Label>
                    <Input id="birthDate" name="birthDate" type="date" required />
                  </div>
                )}
              </div>
              <Button type="submit" disabled={busy} size="sm" className="self-start">
                {busy ? "Ativando…" : "Ativar recebimentos"}
              </Button>
            </form>
          )}

          {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

          {hasAccount && status !== "active" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onboardingUrl && (
                <Button asChild size="sm">
                  <a href={onboardingUrl} target="_blank" rel="noopener noreferrer">
                    Enviar documentos ao Asaas
                  </a>
                </Button>
              )}
              <Button onClick={refresh} disabled={busy} size="sm" variant="outline">
                {busy ? "Verificando…" : "Atualizar status"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
