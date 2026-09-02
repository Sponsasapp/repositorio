"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { salvarPerfilPiloto, type PerfilState } from "./actions";
import { Section, Field, UfSelect } from "./_ui";
import { OFFERED_DELIVERABLES, SPONSOR_CATEGORIES } from "@/lib/deliverables";
import type {
  Profile,
  AthleteProfile,
  SocialLink,
  AthletePackage,
} from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";

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
  packages,
  rateCardLimit,
}: {
  profile: Profile;
  athlete: AthleteProfile | null;
  socials: SocialLink[];
  packages: AthletePackage[];
  rateCardLimit: number | null;
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
            <UfSelect defaultValue={profile.state} />
          </Field>
        </div>
        <Field label="Bio" htmlFor="bio" hint="Um parágrafo curto sobre você.">
          <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={3} />
        </Field>
        <Field label="Foto">
          <ImageUpload
            name="photo_url"
            initial={profile.photo_url}
            shape="circle"
            hint="JPG, PNG ou WebP, até 3 MB."
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
        <Field
          label="Foto do carro"
          hint="Muita marca reconhece o carro antes do piloto."
        >
          <ImageUpload
            name="car_photo_url"
            initial={athlete?.car_photo_url ?? null}
            shape="square"
          />
        </Field>
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
        <Field label="Aceita patrocínio de">
          <SponsorCategories initial={athlete?.sponsor_categories ?? []} />
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

      {/* ---- Tabela de preços ---- */}
      <Section title="Tabela de preços">
        <p className="text-muted-foreground -mt-2 mb-1 text-xs">
          O que uma marca pode contratar e por quanto. Ex: “Adesivo no carro”,
          “Pacote 3 stories/semana”, “Stories + reels”.
          {rateCardLimit != null &&
            ` Plano Free: até ${rateCardLimit} itens.`}
        </p>
        <PriceTable initial={packages} limit={rateCardLimit} />
      </Section>

      {/* ---- Redes sociais ---- */}
      <Section title="Redes sociais">
        <p className="text-muted-foreground -mt-2 mb-1 text-xs">
          Informe seguidores, alcance médio e interações médias por post. O
          engajamento (interações ÷ seguidores) é calculado sozinho — ajuste se
          tiver o número real.
        </p>
        <div className="flex flex-col gap-5">
          {PLATFORMS.map((p) => (
            <SocialRow key={p.key} platform={p} initial={social(p.key)} />
          ))}
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

const onlyDigits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

function SocialRow({
  platform,
  initial,
}: {
  platform: { key: string; label: string };
  initial?: SocialLink;
}) {
  const [followers, setFollowers] = useState(
    initial?.followers?.toString() ?? "",
  );
  const [reach, setReach] = useState(initial?.avg_reach?.toString() ?? "");
  const [interactions, setInteractions] = useState(
    initial?.avg_interactions?.toString() ?? "",
  );
  const [engagement, setEngagement] = useState(
    initial?.engagement_rate?.toString() ?? "",
  );
  // Vira true quando o usuário edita o engajamento à mão nesta sessão.
  const [engTouched, setEngTouched] = useState(false);

  function recalc(f: string, i: string) {
    if (engTouched) return;
    const fn = onlyDigits(f);
    const inn = onlyDigits(i);
    // engajamento = interações médias ÷ seguidores × 100, limitado a 100%
    const rate = fn > 0 && inn > 0 ? Math.min((inn / fn) * 100, 100) : null;
    setEngagement(rate == null ? "" : String(Math.round(rate * 10) / 10));
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{platform.label}</p>
      <Input
        name={`social_${platform.key}_url`}
        type="url"
        defaultValue={initial?.url ?? ""}
        placeholder="URL do perfil"
      />
      <div className="grid grid-cols-2 gap-2">
        <MiniField label="Seguidores">
          <Input
            name={`social_${platform.key}_followers`}
            inputMode="numeric"
            value={followers}
            onChange={(e) => {
              setFollowers(e.target.value);
              recalc(e.target.value, interactions);
            }}
          />
        </MiniField>
        <MiniField label="Alcance médio">
          <Input
            name={`social_${platform.key}_avg_reach`}
            inputMode="numeric"
            value={reach}
            onChange={(e) => setReach(e.target.value)}
          />
        </MiniField>
        <MiniField label="Interações médias/post">
          <Input
            name={`social_${platform.key}_avg_interactions`}
            inputMode="numeric"
            value={interactions}
            onChange={(e) => {
              setInteractions(e.target.value);
              recalc(followers, e.target.value);
            }}
          />
        </MiniField>
        <MiniField label="Engajamento %">
          <Input
            name={`social_${platform.key}_engagement_rate`}
            inputMode="numeric"
            value={engagement}
            onChange={(e) => {
              setEngagement(e.target.value);
              setEngTouched(true);
            }}
          />
        </MiniField>
      </div>
    </div>
  );
}

function SponsorCategories({ initial }: { initial: string[] }) {
  const known = new Set<string>(SPONSOR_CATEGORIES);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(initial.filter((c) => known.has(c))),
  );
  const extras = initial.filter((c) => !known.has(c));
  const [outros, setOutros] = useState(extras.length > 0);
  const [outrosText, setOutrosText] = useState(extras.join(", "));

  const toggle = (c: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  // valor final enviado no form (hidden), separado por "|"
  const payload = [
    ...[...checked],
    ...(outros
      ? outrosText
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : []),
  ].join("|");

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="sponsor_categories" value={payload} />
      <div className="flex flex-wrap gap-2">
        {SPONSOR_CATEGORIES.map((c) => (
          <label
            key={c}
            className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
          >
            <input
              type="checkbox"
              checked={checked.has(c)}
              onChange={() => toggle(c)}
              className="accent-primary"
            />
            {c}
          </label>
        ))}
        <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors">
          <input
            type="checkbox"
            checked={outros}
            onChange={(e) => setOutros(e.target.checked)}
            className="accent-primary"
          />
          Outros
        </label>
      </div>
      {outros && (
        <Input
          value={outrosText}
          onChange={(e) => setOutrosText(e.target.value)}
          placeholder="Ex: tintas, guincho, escola de pilotagem (separe por vírgula)"
        />
      )}
    </div>
  );
}

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      {children}
    </label>
  );
}

type PkgDraft = { title: string; description: string; price: string };

function PriceTable({
  initial,
  limit,
}: {
  initial: AthletePackage[];
  limit: number | null;
}) {
  const [rows, setRows] = useState<PkgDraft[]>(
    initial.length > 0
      ? initial.map((p) => ({
          title: p.title,
          description: p.description ?? "",
          price: p.price != null ? String(p.price) : "",
        }))
      : [{ title: "", description: "", price: "" }],
  );

  const update = (i: number, patch: Partial<PkgDraft>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const remove = (i: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== i) : r));
  const add = () =>
    setRows((r) => [...r, { title: "", description: "", price: "" }]);

  const payload = JSON.stringify(rows.filter((r) => r.title.trim().length > 0));
  const atLimit = limit != null && rows.length >= limit;

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="packages" value={payload} />
      {rows.map((row, i) => (
        <div
          key={i}
          className="border-border flex flex-col gap-2 rounded-md border p-3"
        >
          <div className="grid grid-cols-[1fr_130px] gap-2">
            <Input
              value={row.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Item (ex: Adesivo no carro)"
              aria-label="Título do item"
            />
            <Input
              value={row.price}
              onChange={(e) => update(i, { price: e.target.value })}
              inputMode="numeric"
              placeholder="R$"
              aria-label="Preço"
            />
          </div>
          <Input
            value={row.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder="Descrição (opcional)"
            aria-label="Descrição do item"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-destructive self-start text-xs"
          >
            Remover
          </button>
        </div>
      ))}
      {atLimit ? (
        <p className="text-muted-foreground text-xs">
          Limite do plano Free atingido ({limit} itens).{" "}
          <a href="/configuracoes" className="underline">
            Ver PRO
          </a>
        </p>
      ) : (
        <button
          type="button"
          onClick={add}
          className="border-border text-muted-foreground hover:text-foreground self-start rounded-md border border-dashed px-3 py-1.5 text-sm"
        >
          + Adicionar item
        </button>
      )}
    </div>
  );
}
