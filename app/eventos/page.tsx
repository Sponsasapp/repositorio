import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { SponseeCard } from "@/components/sponsee-card";
import { formatDateBR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Eventos — Sponsas",
  description: "Organizadores de eventos do esporte a motor buscando patrocínio.",
};

type Row = {
  id: string;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  event_profiles: { event_kind: string | null; next_date: string | null } | null;
};

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, name, photo_url, city, state, event_profiles(event_kind, next_date)",
    )
    .eq("type", "event")
    .order("name");

  const term = (q ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as unknown as Row[]).filter(
    (r) => !term || r.name.toLowerCase().includes(term),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl">Eventos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Etapas, encontros e feiras buscando patrocinadores.
        </p>

        <form className="mt-6 flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome"
            className="border-input bg-card h-9 flex-1 rounded-lg border px-3 text-sm"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground h-9 shrink-0 rounded-lg px-4 text-sm font-medium"
          >
            Buscar
          </button>
        </form>

        {rows.length === 0 ? (
          <p className="text-muted-foreground mt-10 text-sm">
            Nenhum evento cadastrado ainda.{" "}
            <Link href="/cadastro?tipo=evento" className="underline">
              Cadastrar meu evento
            </Link>
          </p>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <SponseeCard
                key={r.id}
                id={r.id}
                urlPrefix="evento"
                name={r.name}
                photo_url={r.photo_url}
                line={[
                  r.event_profiles?.event_kind,
                  r.event_profiles?.next_date
                    ? formatDateBR(r.event_profiles.next_date)
                    : null,
                  [r.city, r.state].filter(Boolean).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
