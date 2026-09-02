"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { salvarPerfilPiloto, type PerfilState } from "./actions";
import { Section, Field, UfSelect } from "./_ui";
import { OFFERED_DELIVERABLES, SPONSOR_CATEGORIES } from "@/lib/deliverables";
import type {
  Profile,
  AthleteProfile,
  AthleteCar,
  AthleteAchievement,
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
  cars,
  achievements,
  socials,
  packages,
  rateCardLimit,
}: {
  profile: Profile;
  athlete: AthleteProfile | null;
  cars: AthleteCar[];
  achievements: AthleteAchievement[];
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

  const carsInit = cars.map((c) => ({
    ...c,
    conquistas: achievements.filter((a) => a.car_id === c.id),
  }));
  const outrasIniciais = achievements.filter((a) => !a.car_id);

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

      {/* ---- Carros (sub-perfis) ---- */}
      <Section title="Carros">
        <p className="text-muted-foreground -mt-2 mb-1 text-xs">
          O patrocínio é por carro. Cada carro é um sub-perfil: equipe,
          campeonatos, foto e as conquistas feitas com ele. As conquistas de
          todos os carros aparecem somadas no seu perfil.
        </p>
        <CarList initial={carsInit} />
      </Section>

      {/* ---- Outras conquistas ---- */}
      <Section title="Outras conquistas">
        <p className="text-muted-foreground -mt-2 mb-1 text-xs">
          Títulos e recordes que não estão ligados a um carro atual — ex: carro
          já vendido, kart, categorias antigas. Entram somados no seu perfil
          junto com as conquistas dos carros. Pode usar emoji no título.
        </p>
        <OutrasConquistas initial={outrasIniciais} />
      </Section>

      {/* ---- Lista ---- */}
      <Section title="Lista">
        <p className="text-muted-foreground -mt-2 mb-1 text-xs">
          Ou você já está numa lista de arrancada (com uma posição), ou está no
          Shark Tank disputando uma vaga — nunca os dois ao mesmo tempo.
        </p>
        <ListaField athlete={athlete} />
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

type AchDraft = { key: string; title: string; year: string; detail: string };

const newAch = (): AchDraft => ({
  key: crypto.randomUUID(),
  title: "",
  year: "",
  detail: "",
});

/** Editor de lista de conquistas (título + ano + detalhe). Controlado pelo pai. */
function AchievementRows({
  rows,
  onChange,
  addLabel = "+ Conquista",
}: {
  rows: AchDraft[];
  onChange: (next: AchDraft[]) => void;
  addLabel?: string;
}) {
  const update = (i: number, patch: Partial<AchDraft>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const add = () => onChange([...rows, newAch()]);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div
          key={row.key}
          className="border-border/70 flex flex-col gap-2 rounded-md border border-dashed p-2"
        >
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <Input
              value={row.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Título (ex: 🏆 Campeão Paulista)"
              aria-label="Título da conquista"
            />
            <Input
              value={row.year}
              onChange={(e) => update(i, { year: e.target.value })}
              inputMode="numeric"
              placeholder="Ano"
              aria-label="Ano"
            />
          </div>
          <Input
            value={row.detail}
            onChange={(e) => update(i, { detail: e.target.value })}
            placeholder="Detalhe (categoria, tempo, etapa, recorde…)"
            aria-label="Detalhe da conquista"
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
      <button
        type="button"
        onClick={add}
        className="border-border text-muted-foreground hover:text-foreground self-start rounded-md border border-dashed px-2 py-1 text-xs"
      >
        {addLabel}
      </button>
    </div>
  );
}

type CarDraft = {
  key: string;
  name: string;
  team: string;
  championships: string;
  photo_url: string;
  conquistas: AchDraft[];
};

const newCar = (): CarDraft => ({
  key: crypto.randomUUID(),
  name: "",
  team: "",
  championships: "",
  photo_url: "",
  conquistas: [],
});

type CarInit = AthleteCar & { conquistas: AthleteAchievement[] };

function CarList({ initial }: { initial: CarInit[] }) {
  const [rows, setRows] = useState<CarDraft[]>(
    initial.length > 0
      ? initial.map((c) => ({
          key: c.id,
          name: c.name,
          team: c.team ?? "",
          championships: c.championships ?? "",
          photo_url: c.photo_url ?? "",
          conquistas: c.conquistas.map((a) => ({
            key: a.id,
            title: a.title,
            year: a.year ?? "",
            detail: a.detail ?? "",
          })),
        }))
      : [newCar()],
  );

  const update = (i: number, patch: Partial<CarDraft>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const remove = (i: number) =>
    setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== i) : [newCar()]));
  const add = () => setRows((r) => [...r, newCar()]);

  const payload = JSON.stringify(
    rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({
        name: r.name.trim(),
        team: r.team.trim(),
        championships: r.championships.trim(),
        photo_url: r.photo_url,
        conquistas: r.conquistas
          .filter((a) => a.title.trim().length > 0)
          .map((a) => ({
            title: a.title.trim(),
            year: a.year.trim(),
            detail: a.detail.trim(),
          })),
      })),
  );

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="cars" value={payload} />
      {rows.map((row, i) => (
        <div
          key={row.key}
          className="border-border bg-background/40 flex flex-col gap-2 rounded-md border border-l-2 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={row.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Carro (ex: Gol G4)"
              aria-label="Carro"
            />
            <Input
              value={row.team}
              onChange={(e) => update(i, { team: e.target.value })}
              placeholder="Equipe / oficina"
              aria-label="Equipe"
            />
          </div>
          <Input
            value={row.championships}
            onChange={(e) => update(i, { championships: e.target.value })}
            placeholder="Campeonatos que disputa com este carro"
            aria-label="Campeonatos"
          />
          <ImageUpload
            initial={row.photo_url || null}
            shape="square"
            hint="Foto do carro (opcional)."
            onChange={(u) => update(i, { photo_url: u })}
          />
          <div className="mt-1 flex flex-col gap-1.5">
            <span className="text-muted-foreground text-[11px]">
              Conquistas com este carro
            </span>
            <AchievementRows
              rows={row.conquistas}
              onChange={(next) => update(i, { conquistas: next })}
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-destructive mt-1 self-start text-xs"
          >
            Remover carro
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="border-border text-muted-foreground hover:text-foreground self-start rounded-md border border-dashed px-3 py-1.5 text-sm"
      >
        + Adicionar carro
      </button>
    </div>
  );
}

function OutrasConquistas({ initial }: { initial: AthleteAchievement[] }) {
  const [rows, setRows] = useState<AchDraft[]>(
    initial.map((a) => ({
      key: a.id,
      title: a.title,
      year: a.year ?? "",
      detail: a.detail ?? "",
    })),
  );

  const payload = JSON.stringify(
    rows
      .filter((r) => r.title.trim().length > 0)
      .map((r) => ({
        title: r.title.trim(),
        year: r.year.trim(),
        detail: r.detail.trim(),
      })),
  );

  return (
    <>
      <input type="hidden" name="outras_conquistas" value={payload} />
      <AchievementRows
        rows={rows}
        onChange={setRows}
        addLabel="+ Adicionar conquista"
      />
    </>
  );
}

type ListStatus = "none" | "member" | "shark";

function ListaField({ athlete }: { athlete: AthleteProfile | null }) {
  const [status, setStatus] = useState<ListStatus>(
    athlete?.list_shark_tank
      ? "shark"
      : athlete?.list_member
        ? "member"
        : "none",
  );

  const opt = (value: ListStatus, label: string) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="radio"
        name="list_status"
        value={value}
        checked={status === value}
        onChange={() => setStatus(value)}
        className="accent-primary"
      />
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {opt("none", "Não faço parte de nenhuma lista")}
        {opt("member", "Faço parte de uma lista")}
        {opt("shark", "Estou no Shark Tank (disputando vaga na lista)")}
      </div>

      {status !== "none" && (
        <MiniField label="Qual lista">
          <Input
            name="list_name"
            defaultValue={athlete?.list_name ?? ""}
            placeholder="Ex: Lista 011, Lista 015"
          />
        </MiniField>
      )}
      {status === "member" && (
        <MiniField label="Minha posição na lista">
          <Input
            name="list_position"
            defaultValue={
              athlete?.list_position != null ? String(athlete.list_position) : ""
            }
            inputMode="numeric"
            placeholder="Ex: 3"
          />
        </MiniField>
      )}
      {status === "shark" && (
        <MiniField label="Data da próxima etapa do Shark Tank">
          <Input
            name="list_shark_tank_date"
            type="date"
            defaultValue={athlete?.list_shark_tank_date ?? ""}
          />
        </MiniField>
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
