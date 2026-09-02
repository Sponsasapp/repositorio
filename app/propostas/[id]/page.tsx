import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatBRL } from "@/lib/format";
import { timeAgo } from "@/lib/relative-time";
import { responderProposta, retirarProposta } from "../actions";
import { PROPOSAL_STATUS } from "@/lib/proposal";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Proposta — Sponsas" };

type Row = Proposal & {
  from: { name: string | null; type: string } | null;
  to: { name: string | null; type: string } | null;
};

export default async function PropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/propostas/${id}`);

  const { data } = await supabase
    .from("proposals")
    .select(
      "*, from:profiles!proposals_from_profile_id_fkey(name, type), to:profiles!proposals_to_profile_id_fkey(name, type)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const p = data as unknown as Row;

  const amRecipient = p.to_profile_id === user.id;
  const amSender = p.from_profile_id === user.id;
  if (!amRecipient && !amSender) notFound();

  const st = PROPOSAL_STATUS[p.status];

  let sponsorshipId: string | null = null;
  if (p.status === "accepted") {
    const { data: sp } = await supabase
      .from("sponsorships")
      .select("id")
      .eq("proposal_id", p.id)
      .maybeSingle();
    sponsorshipId = sp?.id ?? null;
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/propostas"
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          ← Propostas
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl">
              {amRecipient
                ? `Proposta de ${p.from?.name ?? "—"}`
                : `Proposta para ${p.to?.name ?? "—"}`}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Enviada {timeAgo(p.created_at)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${st?.cls}`}>
            {st?.label}
          </span>
        </div>

        <div className="border-border bg-card mt-6 flex flex-col gap-4 rounded-xl border p-6 text-sm">
          <Linha label="Dinheiro">
            {p.value != null ? `${formatBRL(p.value)} / mês` : "—"}
          </Linha>
          {(p.payment_type === "trade" || p.payment_type === "mixed") && (
            <Linha label="Permuta">
              {p.trade_description ?? "—"}
              {p.trade_value != null && (
                <span className="text-muted-foreground">
                  {" "}
                  · valor estimado {formatBRL(p.trade_value)}
                </span>
              )}
            </Linha>
          )}
          <Linha label="Duração">
            {p.duration_months != null ? `${p.duration_months} meses` : "—"}
          </Linha>
          {p.deliverables && p.deliverables.length > 0 && (
            <Linha label="Entregas">
              <span className="flex flex-wrap gap-1.5">
                {p.deliverables.map((d) => (
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
          {p.opportunity_id && (
            <Linha label="Oportunidade">
              <Link
                href={`/oportunidades/${p.opportunity_id}`}
                className="underline underline-offset-2"
              >
                ver vaga
              </Link>
            </Linha>
          )}
        </div>

        {p.message && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-1 text-xs">Observações</p>
            <p className="border-border bg-card rounded-lg border p-4 text-sm whitespace-pre-line">
              {p.message}
            </p>
          </div>
        )}

        {/* Ações */}
        {p.status === "pending" && amRecipient && (
          <form action={responderProposta} className="mt-6 flex gap-2">
            <input type="hidden" name="proposal_id" value={p.id} />
            <Button type="submit" name="decision" value="accepted" size="lg">
              Aceitar
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              size="lg"
              variant="ghost"
            >
              Recusar
            </Button>
          </form>
        )}

        {p.status === "pending" && amSender && (
          <form action={retirarProposta} className="mt-6">
            <input type="hidden" name="proposal_id" value={p.id} />
            <Button type="submit" size="lg" variant="outline">
              Retirar proposta
            </Button>
          </form>
        )}

        {p.status === "accepted" && sponsorshipId && (
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href={`/patrocinios/${sponsorshipId}`}>Ver patrocínio</Link>
            </Button>
          </div>
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
