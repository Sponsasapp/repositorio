import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentSummary } from "@/lib/format";
import { timeAgo } from "@/lib/relative-time";
import { PROPOSAL_STATUS } from "@/lib/proposal";
import type { Proposal } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Propostas — Sponsas" };

type Row = Proposal & {
  from: { name: string | null } | null;
  to: { name: string | null } | null;
};

export default async function PropostasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/propostas");

  const { data } = await supabase
    .from("proposals")
    .select(
      "*, from:profiles!proposals_from_profile_id_fkey(name), to:profiles!proposals_to_profile_id_fkey(name)",
    )
    .or(`from_profile_id.eq.${user.id},to_profile_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const recebidas = rows.filter((r) => r.to_profile_id === user.id);
  const enviadas = rows.filter((r) => r.from_profile_id === user.id);

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl">Propostas</h1>

        <Bloco
          titulo="Recebidas"
          rows={recebidas}
          nome={(r) => r.from?.name ?? "—"}
          vazio="Nenhuma proposta recebida."
        />
        <Bloco
          titulo="Enviadas"
          rows={enviadas}
          nome={(r) => r.to?.name ?? "—"}
          vazio="Você ainda não enviou propostas."
        />
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  rows,
  nome,
  vazio,
}: {
  titulo: string;
  rows: Row[];
  nome: (r: Row) => string;
  vazio: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl">{titulo}</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">{vazio}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {rows.map((r) => {
            const st = PROPOSAL_STATUS[r.status];
            return (
              <Link
                key={r.id}
                href={`/propostas/${r.id}`}
                className="border-border border-l-primary bg-card hover:border-l-primary/60 flex items-center justify-between gap-4 rounded-lg border border-l-3 p-4 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium">{nome(r)}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {paymentSummary(r)}
                    {r.duration_months ? ` · ${r.duration_months} meses` : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {timeAgo(r.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${st?.cls}`}
                >
                  {st?.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
