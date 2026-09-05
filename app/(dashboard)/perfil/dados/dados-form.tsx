"use client";

import { useActionState } from "react";
import { salvarDadosPessoais, type DadosState } from "./actions";
import { BR_UF } from "@/lib/br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AthleteDocument } from "@/lib/types/database.types";

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

export function DadosForm({ doc }: { doc: AthleteDocument | null }) {
  const [state, formAction, pending] = useActionState<DadosState, FormData>(
    salvarDadosPessoais,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field id="full_name" label="Nome completo (como no documento)">
        <Input
          id="full_name"
          name="full_name"
          defaultValue={doc?.full_legal_name ?? ""}
          required
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="cpf" label="CPF">
          <Input
            id="cpf"
            name="cpf"
            inputMode="numeric"
            defaultValue={doc?.cpf ?? ""}
            placeholder="000.000.000-00"
            required
          />
        </Field>
        <Field id="rg" label="RG">
          <Input id="rg" name="rg" defaultValue={doc?.rg ?? ""} required />
        </Field>
      </div>
      <Field id="birth_date" label="Data de nascimento">
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          defaultValue={doc?.birth_date ?? ""}
          required
          className="max-w-48"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field id="street" label="Rua / logradouro">
          <Input
            id="street"
            name="street"
            defaultValue={doc?.address_street ?? ""}
            required
          />
        </Field>
        <Field id="number" label="Número">
          <Input
            id="number"
            name="number"
            defaultValue={doc?.address_number ?? ""}
            required
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="complement" label="Complemento (opcional)">
          <Input
            id="complement"
            name="complement"
            defaultValue={doc?.address_complement ?? ""}
          />
        </Field>
        <Field id="district" label="Bairro">
          <Input
            id="district"
            name="district"
            defaultValue={doc?.address_district ?? ""}
            required
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
        <Field id="cep" label="CEP">
          <Input
            id="cep"
            name="cep"
            inputMode="numeric"
            defaultValue={doc?.address_zip ?? ""}
            placeholder="00000-000"
            required
          />
        </Field>
        <Field id="city" label="Cidade">
          <Input
            id="city"
            name="city"
            defaultValue={doc?.address_city ?? ""}
            required
          />
        </Field>
        <Field id="uf" label="UF">
          <select
            id="uf"
            name="uf"
            required
            defaultValue={doc?.address_state ?? ""}
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

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-success text-sm">Dados salvos.</p>}

      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? "Salvando…" : "Salvar dados"}
      </Button>
    </form>
  );
}
