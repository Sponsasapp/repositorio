"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentOnboardingStatus } from "@/lib/types/database.types";

const COPY: Record<
  PaymentOnboardingStatus,
  { label: string; hint: string; tone: string }
> = {
  none: {
    label: "Não ativado",
    hint: "Ative para receber os patrocínios direto na sua conta, com repasse automático.",
    tone: "text-muted-foreground",
  },
  pending: {
    label: "Em análise",
    hint: "O Asaas está verificando seus dados. Isso costuma levar algumas horas.",
    tone: "text-primary",
  },
  active: {
    label: "Ativo",
    hint: "Tudo certo — você já pode receber patrocínios pela Sponsas.",
    tone: "text-success",
  },
  rejected: {
    label: "Recusado",
    hint: "O Asaas não aprovou o cadastro. Fale com a gente para entender o motivo.",
    tone: "text-destructive",
  },
};

export function RecebimentosCard({
  status,
  hasAccount,
}: {
  status: PaymentOnboardingStatus;
  hasAccount: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = COPY[status];

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/asaas/onboarding", { method: "POST" });
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
      </div>
      <p className="text-muted-foreground mt-2 text-sm">{c.hint}</p>

      {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "none" && (
          <Button onClick={activate} disabled={busy} size="sm">
            {busy ? "Ativando…" : "Ativar recebimentos"}
          </Button>
        )}
        {hasAccount && status !== "active" && status !== "none" && (
          <Button
            onClick={refresh}
            disabled={busy}
            size="sm"
            variant="outline"
          >
            {busy ? "Verificando…" : "Verificar status"}
          </Button>
        )}
      </div>
    </section>
  );
}
