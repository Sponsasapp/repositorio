"use client";

import { useActionState } from "react";
import { criarOportunidade, type OppState } from "../actions";
import { OFFERED_DELIVERABLES } from "@/lib/deliverables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OpportunityForm() {
  const [state, formAction, pending] = useActionState<OppState, FormData>(
    criarOportunidade,
    undefined,
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Ex: Patrocínio para piloto de arrancada na região Sul"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget">Orçamento (R$/mês)</Label>
          <Input
            id="budget"
            name="budget"
            inputMode="numeric"
            placeholder="2000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duration_months">Duração (meses)</Label>
          <Input
            id="duration_months"
            name="duration_months"
            inputMode="numeric"
            placeholder="6"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="region">Região de interesse</Label>
        <Input
          id="region"
          name="region"
          placeholder="Sul, Sudeste, Nacional..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Entregas esperadas</Label>
        <div className="flex flex-wrap gap-2">
          {OFFERED_DELIVERABLES.map((d) => (
            <label
              key={d.value}
              className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
            >
              <input
                type="checkbox"
                name="expected_deliverables"
                value={d.value}
                className="accent-primary"
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Contexto da campanha, o que você espera do piloto, critérios..."
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
        {pending ? "Publicando…" : "Publicar oportunidade"}
      </Button>
    </form>
  );
}
