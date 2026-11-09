"use client";

import { useActionState } from "react";
import { reenviarConfirmacao, type ResendState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResendConfirmation({ email }: { email?: string }) {
  const [state, formAction, pending] = useActionState<ResendState, FormData>(
    reenviarConfirmacao,
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="border-success/30 bg-success-soft text-success rounded-md border-l-2 px-3 py-2 text-sm">
        Se existir uma conta pendente com esse e-mail, um novo link de
        confirmação foi enviado. Veja também o spam.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Não recebeu ou o link expirou? Reenvie a confirmação:
      </p>
      <div className="flex gap-2">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={email}
          placeholder="seu@email.com"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Enviando…" : "Reenviar"}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
