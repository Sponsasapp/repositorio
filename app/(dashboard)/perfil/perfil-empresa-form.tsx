"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { salvarPerfilEmpresa, type PerfilState } from "./actions";
import { Section, Field, UfSelect } from "./_ui";
import type { Profile, CompanyProfile } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";

export function PerfilEmpresaForm({
  profile,
  company,
}: {
  profile: Profile;
  company: CompanyProfile | null;
}) {
  const [state, formAction, pending] = useActionState<PerfilState, FormData>(
    salvarPerfilEmpresa,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Perfil salvo.");
  }, [state]);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Section title="Dados da empresa">
        <Field label="Nome da empresa" htmlFor="name">
          <Input id="name" name="name" defaultValue={profile.name} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Segmento" htmlFor="segment">
            <Input
              id="segment"
              name="segment"
              defaultValue={company?.segment ?? ""}
              placeholder="Autopeças, lubrificantes..."
            />
          </Field>
          <Field label="Região de interesse" htmlFor="region_of_interest">
            <Input
              id="region_of_interest"
              name="region_of_interest"
              defaultValue={company?.region_of_interest ?? ""}
              placeholder="Sul, Sudeste, Nacional..."
            />
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Cidade" htmlFor="city">
            <Input id="city" name="city" defaultValue={profile.city ?? ""} />
          </Field>
          <Field label="UF" htmlFor="state">
            <UfSelect defaultValue={profile.state} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Site" htmlFor="website">
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={company?.website ?? ""}
              placeholder="https://..."
            />
          </Field>
          <Field label="Instagram" htmlFor="instagram">
            <Input
              id="instagram"
              name="instagram"
              defaultValue={company?.instagram ?? ""}
              placeholder="@marca"
            />
          </Field>
        </div>
        <Field label="Logo">
          <ImageUpload
            name="photo_url"
            initial={profile.photo_url}
            shape="square"
            hint="JPG, PNG ou WebP, até 3 MB."
          />
        </Field>
        <Field label="Descrição da empresa" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={company?.description ?? ""}
            rows={3}
          />
        </Field>
      </Section>

      <Section title="Campanha de patrocínio">
        <Field
          label="Objetivo da campanha"
          htmlFor="campaign_goal"
          hint="O que você quer alcançar patrocinando um piloto."
        >
          <Textarea
            id="campaign_goal"
            name="campaign_goal"
            defaultValue={company?.campaign_goal ?? ""}
            rows={2}
          />
        </Field>
        <Field label="Público-alvo" htmlFor="target_audience">
          <Textarea
            id="target_audience"
            name="target_audience"
            defaultValue={company?.target_audience ?? ""}
            rows={2}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Orçamento (R$/mês)" htmlFor="budget">
            <Input
              id="budget"
              name="budget"
              inputMode="numeric"
              defaultValue={company?.budget ?? ""}
              placeholder="3000"
            />
          </Field>
          <Field
            label="Duração da campanha (meses)"
            htmlFor="campaign_duration_months"
          >
            <Input
              id="campaign_duration_months"
              name="campaign_duration_months"
              inputMode="numeric"
              defaultValue={company?.campaign_duration_months ?? ""}
              placeholder="6"
            />
          </Field>
        </div>
      </Section>

      {state?.error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border-l-2 px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Salvando…" : "Salvar perfil"}
        </Button>
        {state?.ok && !pending && (
          <span className="text-success text-sm">Salvo.</span>
        )}
      </div>
    </form>
  );
}
