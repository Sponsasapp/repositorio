"use client";

import Link from "next/link";
import { useActionState } from "react";
import { solicitarReset, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecuperarForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    solicitarReset,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="mb-1">
        <h1 className="text-3xl">Recuperar senha</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enviamos um link para você criar uma nova senha.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border-l-2 px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Enviando…" : "Enviar link"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/login" className="text-foreground underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
