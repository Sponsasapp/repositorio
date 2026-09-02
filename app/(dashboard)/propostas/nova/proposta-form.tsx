"use client";

import { useActionState, useState } from "react";
import { enviarProposta, type PropostaState } from "../actions";
import { OFFERED_DELIVERABLES } from "@/lib/deliverables";
import type { ProposalPaymentType } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TIPOS: { value: ProposalPaymentType; label: string; hint: string }[] = [
  { value: "cash", label: "Dinheiro", hint: "Valor mensal em reais" },
  { value: "trade", label: "Permuta", hint: "Produto ou serviço" },
  { value: "mixed", label: "Dinheiro + permuta", hint: "Os dois" },
];

export function PropostaForm({
  para,
  paraNome,
  oportunidade,
}: {
  para: string;
  paraNome: string;
  oportunidade?: string;
}) {
  const [state, formAction, pending] = useActionState<PropostaState, FormData>(
    enviarProposta,
    undefined,
  );
  const [tipo, setTipo] = useState<ProposalPaymentType>("cash");

  const showCash = tipo === "cash" || tipo === "mixed";
  const showTrade = tipo === "trade" || tipo === "mixed";

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="para" value={para} />
      {oportunidade && (
        <input type="hidden" name="oportunidade" value={oportunidade} />
      )}

      <p className="text-muted-foreground text-sm">
        Proposta para <span className="text-foreground font-medium">{paraNome}</span>.
      </p>

      <div className="flex flex-col gap-2">
        <Label>Forma de pagamento</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <label
              key={t.value}
              className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer flex-col rounded-lg border p-3 transition-colors"
            >
              <input
                type="radio"
                name="payment_type"
                value={t.value}
                checked={tipo === t.value}
                onChange={() => setTipo(t.value)}
                className="sr-only"
              />
              <span className="text-sm font-semibold">{t.label}</span>
              <span className="text-muted-foreground text-xs">{t.hint}</span>
            </label>
          ))}
        </div>
      </div>

      {showCash && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value">Valor em dinheiro (R$/mês)</Label>
          <Input
            id="value"
            name="value"
            inputMode="numeric"
            placeholder="2000"
          />
        </div>
      )}

      {showTrade && (
        <div className="grid grid-cols-[1fr_160px] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trade_description">Produto / serviço da permuta</Label>
            <Input
              id="trade_description"
              name="trade_description"
              placeholder="Ex: 1 jogo de pneus por etapa"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trade_value">Valor estimado (R$)</Label>
            <Input
              id="trade_value"
              name="trade_value"
              inputMode="numeric"
              placeholder="3200"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="duration_months">Duração (meses)</Label>
        <Input
          id="duration_months"
          name="duration_months"
          inputMode="numeric"
          placeholder="6"
          className="max-w-32"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Entregas combinadas</Label>
        <div className="flex flex-wrap gap-2">
          {OFFERED_DELIVERABLES.map((d) => (
            <label
              key={d.value}
              className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
            >
              <input
                type="checkbox"
                name="deliverables"
                value={d.value}
                className="accent-primary"
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Observações</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Explique a proposta: contexto, o que espera, condições, prazos de pagamento…"
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border-l-2 px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? "Enviando…" : "Enviar proposta"}
      </Button>
    </form>
  );
}
