import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CompanyCard, type CompanyCardData } from "@/components/company-card";
import { AppShell } from "@/components/app-shell";
import { modalityByValue } from "@/lib/sports";

export const metadata: Metadata = {
  title: "Empresas — Sponsas",
  description: "Marcas do automobilismo buscando pilotos para patrocinar.",
};

type SP = { q?: string; segmento?: string; modalidade?: string };

type Joined = {
  id: string;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  plan: "free" | "pro";
  company_profiles: { segment: string | null; modalities: string[] } | null;
  opportunities: { status: string }[];
};

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, name, photo_url, city, state, plan, company_profiles!inner(segment, modalities), opportunities(status)",
    )
    .eq("type", "company")
    .order("name");

  const all = (data ?? []) as unknown as Joined[];

  const segmentos = [
    ...new Set(
      all
        .map((c) => c.company_profiles?.segment)
        .filter((s): s is string => Boolean(s)),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const q = (sp.q ?? "").trim().toLowerCase();

  const companies: CompanyCardData[] = all
    .filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (sp.segmento && c.company_profiles?.segment !== sp.segmento) return false;
      // Sem modalidades marcadas = aparece em todas.
      const mods = c.company_profiles?.modalities ?? [];
      if (sp.modalidade && mods.length > 0 && !mods.includes(sp.modalidade))
        return false;
      return true;
    })
    .sort((a, b) => (b.plan === "pro" ? 1 : 0) - (a.plan === "pro" ? 1 : 0))
    .map((c) => ({
      id: c.id,
      name: c.name,
      logo_url: c.photo_url,
      segment: c.company_profiles?.segment ?? null,
      city: c.city,
      state: c.state,
      openCount: c.opportunities.filter((o) => o.status === "open").length,
      isPro: c.plan === "pro",
    }));

  const hasFilters = Boolean(sp.q || sp.segmento || sp.modalidade);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Automobilismo
            </p>
            <h1 className="text-4xl">
              Empresas
              {modalityByValue(sp.modalidade)
                ? ` · ${modalityByValue(sp.modalidade)!.label}`
                : ""}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {companies.length} {companies.length === 1 ? "marca" : "marcas"}
              {hasFilters ? " com esses filtros" : " no total"}.
            </p>
          </div>
          <Link
            href={
              sp.modalidade
                ? `/pilotos?modalidade=${encodeURIComponent(sp.modalidade)}`
                : "/pilotos"
            }
            className="text-foreground shrink-0 text-sm underline underline-offset-2"
          >
            Ver pilotos
          </Link>
        </div>

        {/* Filtros — form GET, sem JS */}
        <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por nome"
            className="border-input bg-card h-9 rounded-lg border px-3 text-sm lg:col-span-2"
          />
          <select
            name="segmento"
            defaultValue={sp.segmento ?? ""}
            className="border-input bg-card h-9 rounded-lg border px-2 text-sm"
            aria-label="Segmento"
          >
            <option value="">Segmento</option>
            {segmentos.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-primary text-primary-foreground h-9 rounded-lg px-4 text-sm font-medium"
            >
              Filtrar
            </button>
            {hasFilters && (
              <Link
                href="/empresas"
                className="text-muted-foreground hover:text-foreground flex h-9 items-center px-2 text-sm"
              >
                Limpar
              </Link>
            )}
          </div>
        </form>

        {companies.length === 0 ? (
          <p className="text-muted-foreground mt-12 text-sm">
            Nenhuma empresa encontrada.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <CompanyCard key={c.id} company={c} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
