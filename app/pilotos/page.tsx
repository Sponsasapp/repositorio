import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BR_UF } from "@/lib/br";
import { PilotCard, type PilotCardData } from "@/components/pilot-card";

export const metadata: Metadata = {
  title: "Pilotos — Sponsas",
  description: "Encontre pilotos de arrancada prontos para receber patrocínio.",
};

const ORCAMENTO = [
  { value: "1000", label: "Até R$ 1.000/mês" },
  { value: "3000", label: "Até R$ 3.000/mês" },
  { value: "10000", label: "Até R$ 10.000/mês" },
];

type SP = {
  q?: string;
  modalidade?: string;
  categoria?: string;
  uf?: string;
  orcamento?: string;
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
      "id, name, photo_url, city, state, athlete_profiles!inner(modality, category, desired_value_min), social_links(followers, avg_interactions)",
    )
    .eq("type", "athlete")
    .order("name");

  type Joined = {
    id: string;
    name: string;
    photo_url: string | null;
    city: string | null;
    state: string | null;
    athlete_profiles: {
      modality: string | null;
      category: string | null;
      desired_value_min: number | null;
    } | null;
    social_links: { followers: number | null; avg_interactions: number | null }[];
  };

  const all = (data ?? []) as unknown as Joined[];

  const modalidades = distinct(all.map((p) => p.athlete_profiles?.modality));
  const categorias = distinct(all.map((p) => p.athlete_profiles?.category));

  const q = (sp.q ?? "").trim().toLowerCase();
  const orcMax = sp.orcamento ? Number(sp.orcamento) : null;

  const pilots: PilotCardData[] = all
    .filter((p) => {
      const ap = p.athlete_profiles;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (sp.modalidade && ap?.modality !== sp.modalidade) return false;
      if (sp.categoria && ap?.category !== sp.categoria) return false;
      if (sp.uf && p.state !== sp.uf) return false;
      if (
        orcMax != null &&
        ap?.desired_value_min != null &&
        ap.desired_value_min > orcMax
      )
        return false;
      return true;
    })
    .map((p) => {
      const followers = p.social_links.reduce(
        (s, l) => s + (l.followers ?? 0),
        0,
      );
      const interactions = p.social_links.reduce(
        (s, l) => s + (l.avg_interactions ?? 0),
        0,
      );
      return {
        id: p.id,
        name: p.name,
        photo_url: p.photo_url,
        city: p.city,
        state: p.state,
        modality: p.athlete_profiles?.modality ?? null,
        category: p.athlete_profiles?.category ?? null,
        followers,
        engagement:
          followers > 0 && interactions > 0
            ? Math.min((interactions / followers) * 100, 100)
            : null,
      };
    });

  const hasFilters = Boolean(
    sp.q || sp.modalidade || sp.categoria || sp.uf || sp.orcamento,
  );

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/" className="text-muted-foreground text-sm hover:text-foreground">
          ← Sponsas
        </Link>
        <h1 className="mt-4 text-4xl">Pilotos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {pilots.length} {pilots.length === 1 ? "piloto" : "pilotos"}
          {hasFilters ? " com esses filtros" : " no total"}.
        </p>

        {/* Filtros — form GET, sem JS */}
        <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por nome"
            className="border-input bg-card h-9 rounded-lg border px-3 text-sm lg:col-span-2"
          />
          <FilterSelect name="modalidade" value={sp.modalidade} placeholder="Modalidade" options={modalidades} />
          <FilterSelect name="categoria" value={sp.categoria} placeholder="Categoria" options={categorias} />
          <FilterSelect name="uf" value={sp.uf} placeholder="Estado" options={[...BR_UF]} />
          <FilterSelect
            name="orcamento"
            value={sp.orcamento}
            placeholder="Orçamento"
            options={ORCAMENTO}
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="bg-primary text-primary-foreground h-9 rounded-lg px-4 text-sm font-medium"
            >
              Filtrar
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
    </main>
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
