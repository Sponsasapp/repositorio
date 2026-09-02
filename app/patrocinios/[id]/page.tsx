import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatBRL } from "@/lib/format";
import { SPONSORSHIP_STATUS } from "@/lib/sponsorship";
import { encerrarPatrocinio } from "../actions";
import { Button } from "@/components/ui/button";
import type { Sponsorship, Proposal } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Patrocínio — Sponsas" };

type Row = Sponsorship & {
  athlete: { id: string; name: string | null } | null;
  company: { id: string; name: string | null } | null;
  proposal: Pick<Proposal, "deliverables" | "message"> | null;
};

export default async function PatrocinioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/patrocinios/${id}`);

  const { data } = await supabase
    .from("sponsorships")
    .select(
      "*, athlete:profiles!sponsorships_athlete_id_fkey(id, name), company:profiles!sponsorships_company_id_fkey(id, name), proposal:proposals(deliverables, message)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const s = data as unknown as Row;
  if (s.athlete_id !== user.id && s.company_id !== user.id) notFound();

  const st = SPONSORSHIP_STATUS[s.status];
  const deliverables = s.proposal?.deliverables ?? [];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/patrocinios"
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          ← Patrocínios
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl">
              {s.company?.name ?? "—"} × {s.athlete?.name ?? "—"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Início {new Date(s.start_date).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${st?.cls}`}>
            {st?.label}
          </span>
        </div>

        <div className="border-border bg-card mt-6 flex flex-col gap-4 rounded-xl border p-6 text-sm">
          <Linha label="Dinheiro">
            {s.value != null ? `${formatBRL(s.value)} / mês` : "—"}
          </Linha>
          {(s.payment_type === "trade" || s.payment_type === "mixed") && (
            <Linha label="Permuta">
              {s.trade_description ?? "—"}
              {s.trade_value != null && (
                <span className="text-muted-foreground">
                  {" "}
                  · valor estimado {formatBRL(s.trade_value)}
                </span>
              )}
            </Linha>
          )}
          <Linha label="Duração">
            {s.duration_months != null ? `${s.duration_months} meses` : "—"}
          </Linha>
          {deliverables.length > 0 && (
            <Linha label="Entregas">
              <span className="flex flex-wrap gap-1.5">
                {deliverables.map((d) => (
                  <span
                    key={d}
                    className="bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  >
                    {deliverableLabel(d)}
                  </span>
                ))}
              </span>
            </Linha>
          )}
        </div>

        {s.proposal?.message && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-1 text-xs">
              Observações da proposta
            </p>
            <p className="border-border bg-card rounded-lg border p-4 text-sm whitespace-pre-line">
              {s.proposal.message}
            </p>
          </div>
        )}

        <p className="text-muted-foreground mt-6 text-sm">
          O calendário de entregas com comprovação entra no próximo passo.
        </p>

        {s.status === "active" && (
          <form action={encerrarPatrocinio} className="mt-4">
            <input type="hidden" name="sponsorship_id" value={s.id} />
            <Button type="submit" variant="outline" size="sm">
              Encerrar patrocínio
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

function Linha({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
