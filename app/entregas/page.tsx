import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatDateBR } from "@/lib/format";
import type { Deliverable } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Entregas — Sponsas" };

const DLV_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  submitted: { label: "Em revisão", cls: "bg-accent text-accent-foreground" },
  approved: { label: "Aprovada", cls: "bg-success-soft text-success" },
  rejected: { label: "Recusada", cls: "bg-destructive/10 text-destructive" },
};

type Row = Deliverable & {
  sponsorship: {
    id: string;
    company: { name: string | null } | null;
    athlete: { name: string | null } | null;
  } | null;
};

export default async function EntregasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/entregas");

  const { data } = await supabase
    .from("deliverables")
    .select(
      "*, sponsorship:sponsorships(id, company:profiles!sponsorships_company_id_fkey(name), athlete:profiles!sponsorships_athlete_id_fkey(name))",
    )
    .order("due_date", { nullsFirst: false })
    .order("created_at");

  const rows = (data ?? []) as unknown as Row[];
  const pendentes = rows.filter(
    (r) => r.status === "pending" || r.status === "submitted",
  );
  const concluidas = rows.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-4xl">Entregas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Todas as entregas dos seus patrocínios.
        </p>

        <Bloco titulo="Em aberto" rows={pendentes} vazio="Nada em aberto." />
        <Bloco titulo="Concluídas" rows={concluidas} vazio="Nada ainda." />
      </div>
    </main>
  );
}

function Bloco({
  titulo,
  rows,
  vazio,
}: {
  titulo: string;
  rows: Row[];
  vazio: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl">{titulo}</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">{vazio}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((d) => {
            const ds = DLV_STATUS[d.status];
            const par = [
              d.sponsorship?.company?.name,
              d.sponsorship?.athlete?.name,
            ]
              .filter(Boolean)
              .join(" × ");
            return (
              <Link
                key={d.id}
                href={`/patrocinios/${d.sponsorship?.id ?? ""}`}
                className="border-border border-l-primary bg-card hover:border-l-primary/60 flex items-center justify-between gap-4 rounded-lg border border-l-3 p-4 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {deliverableLabel(d.type)}
                    {d.due_date && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · até{" "}
                        {formatDateBR(d.due_date)}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground truncate text-sm">
                    {d.description || par}
                  </p>
                  {d.description && par && (
                    <p className="text-muted-foreground text-xs">{par}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${ds?.cls}`}
                >
                  {ds?.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
