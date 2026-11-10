"use client";

import { useActionState, useState } from "react";
import { salvarDadosJuridicos, type DadosState } from "./actions";
import { BR_UF, onlyDigits } from "@/lib/br";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PartyLegalInfo } from "@/lib/types/database.types";

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

/** Dados jurídicos de empresa/pista/evento/mídia — vão no contrato. */
export function LegalForm({ info }: { info: PartyLegalInfo | null }) {
  const [state, formAction, pending] = useActionState<DadosState, FormData>(
    salvarDadosJuridicos,
    undefined,
  );
  const [doc, setDoc] = useState(info?.document ?? "");
  const isCnpj = onlyDigits(doc).length > 11;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field id="legal_name" label="Razão social (ou nome completo, se pessoa física)">
        <Input
          id="legal_name"
          name="legal_name"
          defaultValue={info?.legal_name ?? ""}
          required
        />
      </Field>
      <Field id="document" label="CNPJ (ou CPF, se pessoa física)">
        <Input
          id="document"
          name="document"
          inputMode="numeric"
          value={doc}
          onChange={(e) => setDoc(e.target.value)}
          placeholder="00.000.000/0000-00"
          required
          className="max-w-64"
        />
      </Field>
      {isCnpj && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="rep_name" label="Representante legal (quem assina)">
            <Input
              id="rep_name"
              name="rep_name"
              defaultValue={info?.rep_name ?? ""}
              required
            />
          </Field>
          <Field id="rep_cpf" label="CPF do representante">
            <Input
              id="rep_cpf"
              name="rep_cpf"
              inputMode="numeric"
              defaultValue={info?.rep_cpf ?? ""}
              placeholder="000.000.000-00"
              required
            />
          </Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field id="street" label="Rua / logradouro">
          <Input
            id="street"
            name="street"
            defaultValue={info?.address_street ?? ""}
            required
          />
        </Field>
        <Field id="number" label="Número">
          <Input
            id="number"
            name="number"
            defaultValue={info?.address_number ?? ""}
            required
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="complement" label="Complemento (opcional)">
          <Input
            id="complement"
            name="complement"
            defaultValue={info?.address_complement ?? ""}
          />
        </Field>
        <Field id="district" label="Bairro">
          <Input
            id="district"
            name="district"
            defaultValue={info?.address_district ?? ""}
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
            defaultValue={info?.address_zip ?? ""}
            placeholder="00000-000"
            required
          />
        </Field>
        <Field id="city" label="Cidade">
          <Input
            id="city"
            name="city"
            defaultValue={info?.address_city ?? ""}
            required
          />
        </Field>
        <Field id="uf" label="UF">
          <select
            id="uf"
            name="uf"
            required
            defaultValue={info?.address_state ?? ""}
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
