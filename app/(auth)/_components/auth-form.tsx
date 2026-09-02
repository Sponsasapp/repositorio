"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

export function AuthForm({
  mode,
  next,
  notice,
}: {
  mode: "login" | "signup";
  next?: string;
  notice?: string;
}) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {notice && (
        <p className="border-success/30 bg-success-soft text-success rounded-md border-l-2 px-3 py-2 text-sm">
          {notice}
        </p>
      )}
      <div className="mb-1">
        <h1 className="text-3xl">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "login"
            ? "Acesse seu painel da Sponsas."
            : "Comece a organizar seus patrocínios."}
        </p>
      </div>

      {mode === "signup" && (
        <fieldset className="grid grid-cols-2 gap-2">
          <TypeCard value="athlete" label="Sou piloto" hint="Busco patrocínio" />
          <TypeCard value="company" label="Sou empresa" hint="Quero patrocinar" />
        </fieldset>
      )}

      {mode === "signup" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          {mode === "login" && (
            <Link
              href="/recuperar-senha"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Esqueci minha senha
            </Link>
          )}
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
      </div>

      {mode === "signup" && (
        <label className="text-muted-foreground flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            name="consent"
            className="accent-primary mt-0.5"
            required
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="text-foreground underline" target="_blank">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link
              href="/privacidade"
              className="text-foreground underline"
              target="_blank"
            >
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
      )}

      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border-l-2 px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending
          ? "Aguarde…"
          : mode === "login"
            ? "Entrar"
            : "Criar conta"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-foreground underline">
              Criar conta
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="text-foreground underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function TypeCard({
  value,
  label,
  hint,
}: {
  value: "athlete" | "company";
  label: string;
  hint: string;
}) {
  return (
    <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer flex-col rounded-lg border p-3 transition-colors">
      <input
        type="radio"
        name="type"
        value={value}
        defaultChecked={value === "athlete"}
        className="sr-only"
      />
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </label>
  );
}
