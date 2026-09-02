"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { redefinirSenha, type AuthState } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

type Status = "checking" | "ok" | "invalid";

export function RedefinirForm() {
  const [status, setStatus] = useState<Status>("checking");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    redefinirSenha,
    undefined,
  );

  useEffect(() => {
    const supabase = createClient();

    // O link de recuperação dispara PASSWORD_RECOVERY quando o @supabase/ssr
    // processa o code/hash da URL.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setStatus("ok");
      }
    });

    // Caso a sessão já exista (code trocado antes do listener montar).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus("ok");
    });

    const t = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  if (status === "checking") {
    return <p className="text-muted-foreground text-sm">Validando o link…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">Link inválido ou expirado</h1>
        <p className="text-muted-foreground text-sm">
          Peça um novo e-mail de redefinição.
        </p>
        <Link
          href="/recuperar-senha"
          className="text-foreground text-sm underline"
        >
          Recuperar senha
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="mb-1">
        <h1 className="text-3xl">Nova senha</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Escolha uma senha de pelo menos 8 caracteres.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
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

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Salvando…" : "Salvar senha"}
      </Button>
    </form>
  );
}
