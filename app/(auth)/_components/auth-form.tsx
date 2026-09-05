"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "../actions";
import { BR_UF } from "@/lib/br";
import { PARTICIPANT, PROFILE_TYPES } from "@/lib/participant-types";
import type { ProfileType } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

export function AuthForm({
  mode,
  next,
  notice,
  defaultType = "athlete",
}: {
  mode: "login" | "signup";
  next?: string;
  notice?: string;
  defaultType?: ProfileType;
}) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );
  const [type, setType] = useState<ProfileType>(defaultType);
  const isSignup = mode === "signup";

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

      {isSignup && (
        <fieldset className="grid grid-cols-2 gap-2">
          {PROFILE_TYPES.map((t) => (
            <TypeCard
              key={t}
              value={t}
              label={PARTICIPANT[t].label}
              hint={PARTICIPANT[t].hint}
              checked={type === t}
              onSelect={setType}
            />
          ))}
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

      {isSignup && type === "athlete" && (
        <fieldset className="border-border flex flex-col gap-3 rounded-lg border p-3">
          <legend className="px-1 text-sm font-semibold">
            Dados pessoais do piloto
          </legend>
          <p className="text-muted-foreground -mt-1 text-xs">
            Ficam privados — visíveis só pra você e a Sponsas. Usados para
            contratos e repasses.
          </p>
          <Field id="full_name" label="Nome completo (como no documento)">
            <Input id="full_name" name="full_name" autoComplete="name" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="cpf" label="CPF">
              <Input id="cpf" name="cpf" inputMode="numeric" placeholder="000.000.000-00" required />
            </Field>
            <Field id="rg" label="RG">
              <Input id="rg" name="rg" required />
            </Field>
          </div>
          <Field id="birth_date" label="Data de nascimento">
            <Input id="birth_date" name="birth_date" type="date" required className="max-w-48" />
          </Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field id="street" label="Rua / logradouro">
              <Input id="street" name="street" autoComplete="address-line1" required />
            </Field>
            <Field id="number" label="Número">
              <Input id="number" name="number" required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="complement" label="Complemento (opcional)">
              <Input id="complement" name="complement" />
            </Field>
            <Field id="district" label="Bairro">
              <Input id="district" name="district" required />
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_1fr_90px] gap-3">
            <Field id="cep" label="CEP">
              <Input id="cep" name="cep" inputMode="numeric" placeholder="00000-000" required />
            </Field>
            <Field id="city" label="Cidade">
              <Input id="city" name="city" autoComplete="address-level2" required />
            </Field>
            <Field id="uf" label="UF">
              <select
                id="uf"
                name="uf"
                required
                defaultValue=""
                className="border-input bg-card h-9 w-full rounded-lg border px-2 text-sm"
              >
                <option value="" disabled>
                  —
                </option>
                {BR_UF.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>
      )}

      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coupon">Cupom (opcional)</Label>
          <Input
            id="coupon"
            name="coupon"
            autoCapitalize="characters"
            placeholder="Código promocional"
          />
          <p className="text-muted-foreground text-xs">
            Tem um código? Ele libera o plano PRO por um período.
          </p>
        </div>
      )}

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

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}

function TypeCard({
  value,
  label,
  hint,
  checked,
  onSelect,
}: {
  value: ProfileType;
  label: string;
  hint: string;
  checked: boolean;
  onSelect: (v: ProfileType) => void;
}) {
  return (
    <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer flex-col rounded-lg border p-3 transition-colors">
      <input
        type="radio"
        name="type"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-muted-foreground text-xs">{hint}</span>
    </label>
  );
}
