import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontalIcon, ChevronDownIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BR_UF } from "@/lib/br";
import { RANK_TIERS, RANK_TIER_ORDER } from "@/lib/rank";
import { MODALITIES, modalityByValue, pickPrimaryModality } from "@/lib/sports";
import { PilotCard, type PilotCardData } from "@/components/pilot-card";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import type { RankTier } from "@/lib/types/database.types";

export const metadata: Metadata = {
  title: "Pilotos — Sponsas",
  description: "Encontre pilotos de arrancada prontos para receber patrocínio.",
};

const ORCAMENTO = [
  { value: "1000", label: "Até R$ 1.000/mês" },
  { value: "3000", label: "Até R$ 3.000/mês" },
  { value: "10000", label: "Até R$ 10.000/mês" },
];

const SEGUIDORES = [
  { value: "1000", label: "1 mil+ seguidores" },
  { value: "10000", label: "10 mil+ seguidores" },
  { value: "50000", label: "50 mil+ seguidores" },
  { value: "100000", label: "100 mil+ seguidores" },
];

const ORDENAR = [
  { value: "rank_desc", label: "Rank Sponsas: maior primeiro" },
  { value: "rank_asc", label: "Rank Sponsas: menor primeiro" },
  { value: "seguidores_desc", label: "Seguidores: mais primeiro" },
  { value: "seguidores_asc", label: "Seguidores: menos primeiro" },
  { value: "alcance_desc", label: "Alcance: maior primeiro" },
  { value: "alcance_asc", label: "Alcance: menor primeiro" },
];

type SP = {
  q?: string;
  modalidade?: string;
  categoria?: string;
  uf?: string;
  orcamento?: string;
  seguidores?: string;
  rank?: string;
  ordenar?: string;
};

export default async function PilotosPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, name, photo_url, city, state, plan, athlete_modalities!inner(modality, category, desired_value_min, rank_tier, rank_score), athlete_cars(photo_url, position, modality), social_links(followers, avg_reach, avg_interactions)",
    )
    .eq("type", "athlete")
    .order("name");

  type ModRow = {
    modality: string;
    category: string | null;
    desired_value_min: number | null;
    rank_tier: RankTier | null;
    rank_score: number | null;
  };
  type Joined = {
    id: string;
    name: string;
    photo_url: string | null;
    city: string | null;
    state: string | null;
    plan: "free" | "pro";
    athlete_modalities: ModRow[];
    athlete_cars: {
      photo_url: string | null;
      position: number;
      modality: string;
    }[];
    social_links: {
      followers: number | null;
      avg_reach: number | null;
      avg_interactions: number | null;
    }[];
  };

  const all = (data ?? []) as unknown as Joined[];

  const categorias = distinct(
    all.flatMap((p) => p.athlete_modalities.map((m) => m.category)),
  );
  const modalidadeAtiva = modalityByValue(sp.modalidade);

  const q = (sp.q ?? "").trim().toLowerCase();
  const orcMax = sp.orcamento ? Number(sp.orcamento) : null;
  const seguidoresMin = sp.seguidores ? Number(sp.seguidores) : null;
  const ordenar = ORDENAR.some((o) => o.value === sp.ordenar)
    ? sp.ordenar
    : null;

  const pilots: PilotCardData[] = all
    .map((p) => {
      // Modalidade usada no card: a filtrada, senão a principal (maior rank).
      const mod = sp.modalidade
        ? (p.athlete_modalities.find((m) => m.modality === sp.modalidade) ?? null)
        : pickPrimaryModality(p.athlete_modalities);
      const followers = p.social_links.reduce(
        (s, l) => s + (l.followers ?? 0),
        0,
      );
      const reach = p.social_links.reduce(
        (s, l) => s + (l.avg_reach ?? 0),
        0,
      );
      const interactions = p.social_links.reduce(
        (s, l) => s + (l.avg_interactions ?? 0),
        0,
      );
      return { p, mod, followers, reach, interactions };
    })
    .filter(
      (x): x is {
        p: Joined;
        mod: ModRow;
        followers: number;
        reach: number;
        interactions: number;
      } => {
        const { p, mod, followers } = x;
        if (!mod) return false;
        if (q && !p.name.toLowerCase().includes(q)) return false;
        if (sp.categoria && mod.category !== sp.categoria) return false;
        if (sp.uf && p.state !== sp.uf) return false;
        if (sp.rank && mod.rank_tier !== sp.rank) return false;
        if (seguidoresMin != null && followers < seguidoresMin) return false;
        if (
          orcMax != null &&
          mod.desired_value_min != null &&
          mod.desired_value_min > orcMax
        )
          return false;
        return true;
      },
    )
    .sort((a, b) => {
      switch (ordenar) {
        case "rank_desc":
          return (b.mod.rank_score ?? -1) - (a.mod.rank_score ?? -1);
        case "rank_asc":
          return (a.mod.rank_score ?? -1) - (b.mod.rank_score ?? -1);
        case "seguidores_desc":
          return b.followers - a.followers;
        case "seguidores_asc":
          return a.followers - b.followers;
        case "alcance_desc":
          return b.reach - a.reach;
        case "alcance_asc":
          return a.reach - b.reach;
        default: {
          const pro = (b.p.plan === "pro" ? 1 : 0) - (a.p.plan === "pro" ? 1 : 0);
          if (pro !== 0) return pro;
          return (b.mod.rank_score ?? -1) - (a.mod.rank_score ?? -1);
        }
      }
    })
    .map(({ p, mod, followers, interactions }) => {
      return {
        id: p.id,
        name: p.name,
        photo_url: p.photo_url,
        car_photo_url: carPhoto(
          p.athlete_cars.filter((c) => c.modality === mod.modality),
        ),
        city: p.city,
        state: p.state,
        modality: mod.modality,
        category: mod.category,
        tier: mod.rank_tier,
        isPro: p.plan === "pro",
        followers,
        engagement:
          followers > 0 && interactions > 0
            ? Math.min((interactions / followers) * 100, 100)
            : null,
      };
    });

  // "Avançados" = tudo que fica dentro do <details> (a modalidade já tem os
  // chips e a busca fica sempre visível fora dele).
  const advancedActive = Boolean(
    sp.categoria || sp.uf || sp.orcamento || sp.seguidores || sp.rank || sp.ordenar,
  );
  const hasFilters = Boolean(sp.q || sp.modalidade || advancedActive);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Automobilismo
            </p>
            <h1 className="text-4xl">
              Pilotos
              {modalidadeAtiva ? ` · ${modalidadeAtiva.label}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {pilots.length} {pilots.length === 1 ? "piloto" : "pilotos"}
              {hasFilters ? " com esses filtros" : " no total"}.
            </p>
          </div>
          <Link
            href={
              sp.modalidade
                ? `/empresas?modalidade=${encodeURIComponent(sp.modalidade)}`
                : "/empresas"
            }
            className="text-foreground shrink-0 text-sm underline underline-offset-2"
          >
            Ver empresas
          </Link>
        </div>

        {/* Modalidades */}
        <div className="mt-5 flex flex-wrap gap-2">
          <ModalityChip
            href="/pilotos"
            label="Todas"
            active={!sp.modalidade}
          />
          {MODALITIES.map((m) => (
            <ModalityChip
              key={m.slug}
              href={`/pilotos?modalidade=${encodeURIComponent(m.value)}`}
              label={m.label}
              active={sp.modalidade === m.value}
            />
          ))}
        </div>

        {/* Filtros — form GET, sem JS. Busca sempre visível; o resto fica
            recolhido num <details> nativo (sem JS) pra não pesar a tela. */}
        <form className="mt-6">
          <div className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Buscar por nome"
              className="border-input bg-card h-9 flex-1 rounded-lg border px-3 text-sm"
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground h-9 shrink-0 rounded-lg px-4 text-sm font-medium"
            >
              Filtrar
            </button>
          </div>

          <details open={advancedActive} className="group mt-3">
            <summary className="text-muted-foreground hover:text-foreground flex w-fit list-none items-center gap-1.5 text-sm select-none [&::-webkit-details-marker]:hidden">
              <SlidersHorizontalIcon className="size-3.5" />
              Mais filtros
              {advancedActive && (
                <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                  ativos
                </span>
              )}
              <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <FilterSelect name="categoria" value={sp.categoria} placeholder="Categoria" options={categorias} />
              <FilterSelect name="uf" value={sp.uf} placeholder="Estado" options={[...BR_UF]} />
              <FilterSelect
                name="orcamento"
                value={sp.orcamento}
                placeholder="Orçamento"
                options={ORCAMENTO}
              />
              <FilterSelect
                name="rank"
                value={sp.rank}
                placeholder="Rank Sponsas"
                options={RANK_TIER_ORDER.map((t) => ({
                  value: t,
                  label: RANK_TIERS[t].label,
                }))}
              />
              <FilterSelect
                name="seguidores"
                value={sp.seguidores}
                placeholder="Seguidores"
                options={SEGUIDORES}
              />
              <FilterSelect
                name="ordenar"
                value={sp.ordenar}
                placeholder="Ordenar por"
                options={ORDENAR}
              />
              {/* Modalidade já é escolhida pelos chips acima; mantém o valor no form. */}
              {sp.modalidade && (
                <input type="hidden" name="modalidade" value={sp.modalidade} />
              )}
              <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground h-9 rounded-lg px-4 text-sm font-medium"
                >
                  Aplicar filtros
                </button>
                {hasFilters && (
                  <Link
                    href="/pilotos"
                    className="text-muted-foreground hover:text-foreground flex h-9 items-center px-2 text-sm"
                  >
                    Limpar
                  </Link>
                )}
              </div>
            </div>
          </details>
        </form>

        {pilots.length === 0 ? (
          <p className="text-muted-foreground mt-12 text-sm">
            Nenhum piloto encontrado. Tente afrouxar os filtros.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pilots.map((p) => (
              <PilotCard key={p.id} pilot={p} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function carPhoto(
  cars: { photo_url: string | null; position: number }[],
): string | null {
  return (
    [...cars].sort((a, b) => a.position - b.position).find((c) => c.photo_url)
      ?.photo_url ?? null
  );
}

function ModalityChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function distinct(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );
}

function FilterSelect({
  name,
  value,
  placeholder,
  options,
}: {
  name: string;
  value?: string;
  placeholder: string;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      className="border-input bg-card h-9 rounded-lg border px-2 text-sm"
      aria-label={placeholder}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}
