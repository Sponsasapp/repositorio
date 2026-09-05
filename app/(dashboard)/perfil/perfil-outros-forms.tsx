"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  salvarPerfilPista,
  salvarPerfilEvento,
  salvarPerfilMidia,
  type PerfilState,
} from "./actions";
import { Section, Field, UfSelect } from "./_ui";
import { MODALITIES } from "@/lib/sports";
import type {
  Profile,
  TrackProfile,
  EventProfile,
  MediaProfile,
} from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";

const MEDIA_ROLES = [
  "Fotografia",
  "Vídeo / filmmaker",
  "Influencer",
  "Podcast",
  "Streaming / cobertura ao vivo",
  "Portal / imprensa",
];

function Chips({
  name,
  options,
  selected,
}: {
  name: string;
  options: { value: string; label: string }[];
  selected: string[] | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="border-border has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
        >
          <input
            type="checkbox"
            name={name}
            value={o.value}
            defaultChecked={selected?.includes(o.value)}
            className="accent-primary"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function Foot({
  state,
  pending,
}: {
  state: PerfilState;
  pending: boolean;
}) {
  return (
    <>
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
    </>
  );
}

function BaseFields({
  profile,
  nameLabel,
}: {
  profile: Profile;
  nameLabel: string;
}) {
  return (
    <>
      <Field label={nameLabel} htmlFor="name">
        <Input id="name" name="name" defaultValue={profile.name} required />
      </Field>
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
          <Input id="website" name="website" type="url" placeholder="https://..." />
        </Field>
        <Field label="Instagram" htmlFor="instagram">
          <Input id="instagram" name="instagram" placeholder="@perfil" />
        </Field>
      </div>
      <Field label="Foto / logo">
        <ImageUpload
          name="photo_url"
          initial={profile.photo_url}
          shape="square"
          hint="JPG, PNG ou WebP, até 3 MB."
        />
      </Field>
    </>
  );
}

export function PerfilPistaForm({
  profile,
  track,
}: {
  profile: Profile;
  track: TrackProfile | null;
}) {
  const [state, formAction, pending] = useActionState<PerfilState, FormData>(
    salvarPerfilPista,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) toast.success("Perfil salvo.");
  }, [state]);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Section title="Dados da pista">
        <BaseFields profile={profile} nameLabel="Nome da pista / autódromo" />
        <Field label="Traçados disponíveis">
          <Chips
            name="layouts"
            options={MODALITIES.map((m) => ({ value: m.value, label: m.label }))}
            selected={track?.layouts}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Extensão (metros)" htmlFor="length_m">
            <Input
              id="length_m"
              name="length_m"
              inputMode="numeric"
              defaultValue={track?.length_m ?? ""}
              placeholder="201"
            />
          </Field>
          <Field label="Capacidade de público" htmlFor="capacity">
            <Input
              id="capacity"
              name="capacity"
              inputMode="numeric"
              defaultValue={track?.capacity ?? ""}
              placeholder="2000"
            />
          </Field>
        </div>
        <Field
          label="Espaços disponíveis para marcas"
          htmlFor="sponsor_spaces"
          hint="Muro de contenção, arco de largada/chegada, boxes, torre..."
        >
          <Textarea
            id="sponsor_spaces"
            name="sponsor_spaces"
            defaultValue={track?.sponsor_spaces ?? ""}
            rows={3}
          />
        </Field>
        <Field label="Descrição" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={track?.description ?? ""}
            rows={3}
          />
        </Field>
      </Section>
      <Foot state={state} pending={pending} />
    </form>
  );
}

export function PerfilEventoForm({
  profile,
  event,
}: {
  profile: Profile;
  event: EventProfile | null;
}) {
  const [state, formAction, pending] = useActionState<PerfilState, FormData>(
    salvarPerfilEvento,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) toast.success("Perfil salvo.");
  }, [state]);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Section title="Dados do evento">
        <BaseFields profile={profile} nameLabel="Nome do evento" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de evento" htmlFor="event_kind">
            <Input
              id="event_kind"
              name="event_kind"
              defaultValue={event?.event_kind ?? ""}
              placeholder="Etapa de campeonato, encontro, test day..."
            />
          </Field>
          <Field label="Próxima data" htmlFor="next_date">
            <Input
              id="next_date"
              name="next_date"
              type="date"
              defaultValue={event?.next_date ?? ""}
              className="max-w-48"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pista / local" htmlFor="track_name">
            <Input
              id="track_name"
              name="track_name"
              defaultValue={event?.track_name ?? ""}
              placeholder="Autódromo..."
            />
          </Field>
          <Field label="Público esperado" htmlFor="expected_public">
            <Input
              id="expected_public"
              name="expected_public"
              inputMode="numeric"
              defaultValue={event?.expected_public ?? ""}
              placeholder="1500"
            />
          </Field>
        </div>
        <Field
          label="Pacotes / cotas de patrocínio"
          htmlFor="sponsor_packages"
          hint="Cota master, naming, ativação, stand..."
        >
          <Textarea
            id="sponsor_packages"
            name="sponsor_packages"
            defaultValue={event?.sponsor_packages ?? ""}
            rows={3}
          />
        </Field>
        <Field label="Descrição" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={event?.description ?? ""}
            rows={3}
          />
        </Field>
      </Section>
      <Foot state={state} pending={pending} />
    </form>
  );
}

export function PerfilMidiaForm({
  profile,
  media,
}: {
  profile: Profile;
  media: MediaProfile | null;
}) {
  const [state, formAction, pending] = useActionState<PerfilState, FormData>(
    salvarPerfilMidia,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) toast.success("Perfil salvo.");
  }, [state]);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <Section title="Dados de mídia">
        <BaseFields profile={profile} nameLabel="Nome / marca" />
        <Field label="O que você faz">
          <Chips
            name="roles"
            options={MEDIA_ROLES.map((r) => ({ value: r, label: r }))}
            selected={media?.roles}
          />
        </Field>
        <Field label="Portfólio (link)" htmlFor="portfolio_url">
          <Input
            id="portfolio_url"
            name="portfolio_url"
            type="url"
            defaultValue={media?.portfolio_url ?? ""}
            placeholder="https://..."
          />
        </Field>
        <Field
          label="Descrição"
          htmlFor="description"
          hint="Seus números de alcance/seguidores ficam na aba de redes sociais do perfil."
        >
          <Textarea
            id="description"
            name="description"
            defaultValue={media?.description ?? ""}
            rows={3}
          />
        </Field>
      </Section>
      <Foot state={state} pending={pending} />
    </form>
  );
}
