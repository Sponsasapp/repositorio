"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { salvarPerfilPiloto, type PerfilState } from "./actions";
import { OFFERED_DELIVERABLES } from "@/lib/deliverables";
import { BR_UF } from "@/lib/br";
import type {
  Profile,
  AthleteProfile,
  SocialLink,
} from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
] as const;

export function PerfilPilotoForm({
  profile,
  athlete,
  socials,
}: {
  profile: Profile;
  athlete: AthleteProfile | null;
  socials: SocialLink[];
}) {
  const [state, formAction, pending] = useActionState<PerfilState, FormData>(
    salvarPerfilPiloto,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Perfil salvo.");
  }, [state]);

  const social = (p: string) => socials.find((s) => s.platform === p);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      {/* ---- Dados básicos ---- */}
      <Section title="Dados básicos">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" defaultValue={profile.name} required />
        </Field>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label="Cidade" htmlFor="city">
            <Input
              id="city"
              name="city"
              defaultValue={profile.city ?? ""}
              placeholder="São Paulo"
            />
          </Field>
          <Field label="UF" htmlFor="state">
            <select
              id="state"
              name="state"
              defaultValue={profile.state ?? ""}
              className="border-input h-9 w-full rounded-lg border bg-transparent px-2 text-sm"
            >
              <option value="">—</option>
              {BR_UF.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Bio" htmlFor="bio" hint="Um parágrafo curto sobre você.">
          <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={3} />
        </Field>
        <Field
          label="Foto (URL)"
          htmlFor="photo_url"
          hint="Link de uma imagem. Upload direto entra depois."
        >
          <Input
            id="photo_url"
            name="photo_url"
            type="url"
            defaultValue={profile.photo_url ?? ""}
            placeholder="https://..."
          />
        </Field>
      </Section>

      {/* ---- Dados esportivos ---- */}
      <Section title="Dados esportivos">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Modalidade" htmlFor="modality">
            <Input
              id="modality"
              name="modality"
              defaultValue={athlete?.modality ?? "Arrancada"}
            />
          </Field>
          <Field label="Categoria" htmlFor="category">
            <Input
              id="category"
              name="category"
              defaultValue={athlete?.category ?? ""}
              placeholder="Street, Pro..."
            />
          </Field>
          <Field label="Equipe" htmlFor="team">
            <Input id="team" name="team" defaultValue={athlete?.team ?? ""} />
          </Field>
          <Field label="Carro" htmlFor="car">
            <Input id="car" name="car" defaultValue={athlete?.car ?? ""} />
          </Field>
        </div>
        <Field label="Campeonato" htmlFor="championship">
          <Input
            id="championship"
            name="championship"
            defaultValue={athlete?.championship ?? ""}
          />
        </Field>
        <Field
          label="Resultados"
          htmlFor="results"
          hint="Histórico livre: títulos, recordes, colocações."
        >
          <Textarea
            id="results"
            name="results"
            defaultValue={athlete?.results ?? ""}
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor desejado — mín. (R$/mês)" htmlFor="desired_value_min">
            <Input
              id="desired_value_min"
              name="desired_value_min"
              inputMode="numeric"
              defaultValue={athlete?.desired_value_min ?? ""}
              placeholder="1000"
            />
          </Field>
          <Field label="Valor desejado — máx. (R$/mês)" htmlFor="desired_value_max">
            <Input
              id="desired_value_max"
              name="desired_value_max"
              inputMode="numeric"
              defaultValue={athlete?.desired_value_max ?? ""}
              placeholder="5000"
            />
          </Field>
        </div>
        <Field
          label="Entregas que oferece"
          hint="Marque o que você consegue entregar."
        >
          <div className="flex flex-wrap gap-2">
            {OFFERED_DELIVERABLES.map((d) => {
              const checked = athlete?.offered_deliverables?.includes(d.value);
              return (
                <label
                  key={d.value}
                  className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
                >
                  <input
                    type="checkbox"
                    name="offered_deliverables"
                    value={d.value}
                    defaultChecked={checked}
                    className="accent-primary"
                  />
                  {d.label}
                </label>
              );
            })}
          </div>
        </Field>
        <Field
          label="Aceita patrocínio de"
          htmlFor="sponsor_categories"
          hint="Separe por vírgula: autopeças, lubrificantes, energéticos"
        >
          <Input
            id="sponsor_categories"
            name="sponsor_categories"
            defaultValue={(athlete?.sponsor_categories ?? []).join(", ")}
          />
        </Field>
        <Field
          label="Disponibilidade / observações"
          htmlFor="availability_notes"
        >
          <Textarea
            id="availability_notes"
            name="availability_notes"
            defaultValue={athlete?.availability_notes ?? ""}
            rows={2}
          />
        </Field>
      </Section>

      {/* ---- Redes sociais ---- */}
      <Section title="Redes sociais">
        <div className="flex flex-col gap-5">
          {PLATFORMS.map((p) => {
            const s = social(p.key);
            return (
              <div key={p.key} className="flex flex-col gap-2">
                <p className="text-sm font-semibold">{p.label}</p>
                <Input
                  name={`social_${p.key}_url`}
                  type="url"
                  defaultValue={s?.url ?? ""}
                  placeholder="URL do perfil"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    name={`social_${p.key}_followers`}
                    inputMode="numeric"
                    defaultValue={s?.followers ?? ""}
                    placeholder="Seguidores"
                  />
                  <Input
                    name={`social_${p.key}_avg_reach`}
                    inputMode="numeric"
                    defaultValue={s?.avg_reach ?? ""}
                    placeholder="Alcance médio"
                  />
                  <Input
                    name={`social_${p.key}_engagement_rate`}
                    inputMode="numeric"
                    defaultValue={s?.engagement_rate ?? ""}
                    placeholder="Engaj. %"
                  />
                </div>
              </div>
            );
          })}
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-primary bg-card rounded-lg border border-l-3 p-5">
      <h2 className="mb-4 text-xl">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}
