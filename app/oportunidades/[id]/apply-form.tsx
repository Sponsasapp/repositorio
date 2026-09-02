"use client";

import { useActionState } from "react";
import { candidatarse, type OppState } from "../actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ApplyForm({ opportunityId }: { opportunityId: string }) {
  const [state, formAction, pending] = useActionState<OppState, FormData>(
    candidatarse,
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="border-success/30 bg-success-soft text-success rounded-md border-l-2 px-3 py-2 text-sm">
        Candidatura enviada. A empresa vai avaliar e responder.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="opportunity_id" value={opportunityId} />
      <Textarea
        name="message"
        rows={3}
        placeholder="Por que você combina com essa campanha? (opcional)"
      />
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? "Enviando…" : "Candidatar-se"}
      </Button>
    </form>
  );
}
