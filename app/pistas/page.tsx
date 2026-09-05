import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { SponseeCard } from "@/components/sponsee-card";
import { modalityLabel } from "@/lib/sports";

export const metadata: Metadata = {
  title: "Pistas — Sponsas",
  description: "Pistas e autódromos buscando patrocínio.",
};

type Row = {
  id: string;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  track_profiles: { layouts: string[] } | null;
};

export default async function PistasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, name, photo_url, city, state, track_profiles(layouts)")
    .eq("type", "track")
    .order("name");

  const term = (q ?? "").trim().toLowerCase();
  const rows = ((data ?? []) as unknown as Row[]).filter(
    (r) => !term || r.name.toLowerCase().includes(term),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl">Pistas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pistas e autódromos com espaço para marcas.
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
            Nenhuma pista cadastrada ainda.{" "}
            <Link href="/cadastro?tipo=pista" className="underline">
              Cadastrar minha pista
            </Link>
          </p>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <SponseeCard
                key={r.id}
                id={r.id}
                urlPrefix="pista"
                name={r.name}
                photo_url={r.photo_url}
                line={[
                  (r.track_profiles?.layouts ?? []).map(modalityLabel).join(", "),
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
