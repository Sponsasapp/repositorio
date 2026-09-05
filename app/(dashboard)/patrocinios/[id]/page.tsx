import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatBRL, formatDateBR } from "@/lib/format";
import { SPONSORSHIP_STATUS } from "@/lib/sponsorship";
import {
  encerrarPatrocinio,
  avaliarEntrega,
  removerEntrega,
} from "../actions";
import { AddDeliverableForm, ProofForm } from "./entrega-forms";
import { Button } from "@/components/ui/button";
import type {
  Sponsorship,
  Proposal,
  Deliverable,
  DeliverableProof,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Patrocínio — Sponsas" };

type Row = Sponsorship & {
  athlete: { id: string; name: string | null } | null;
  company: { id: string; name: string | null } | null;
  proposal: Pick<Proposal, "deliverables" | "message"> | null;
};

type DeliverableRow = Deliverable & { deliverable_proofs: DeliverableProof[] };

const DLV_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  submitted: { label: "Em revisão", cls: "bg-accent text-accent-foreground" },
  approved: { label: "Aprovada", cls: "bg-success-soft text-success" },
  rejected: { label: "Recusada", cls: "bg-destructive/10 text-destructive" },
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
  const agreedDeliverables = s.proposal?.deliverables ?? [];
  const iAmCompany = s.company_id === user.id;
  const iAmAthlete = s.athlete_id === user.id;

  const { data: dlvData } = await supabase
    .from("deliverables")
    .select("*, deliverable_proofs(*)")
    .eq("sponsorship_id", id)
    .order("due_date", { nullsFirst: false })
    .order("created_at");
  const entregas = (dlvData ?? []) as unknown as DeliverableRow[];

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-2xl">
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
              Início {formatDateBR(s.start_date)}
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
          {agreedDeliverables.length > 0 && (
            <Linha label="Entregas">
              <span className="flex flex-wrap gap-1.5">
                {agreedDeliverables.map((d) => (
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

        {/* --- Entregas --- */}
        <section className="mt-8">
          <h2 className="text-xl">Entregas</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {iAmAthlete
              ? "Anexe o link da comprovação de cada entrega. A empresa aprova."
              : "Acompanhe as entregas do piloto e aprove as comprovações."}
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {entregas.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Nenhuma entrega cadastrada ainda.
              </p>
            )}

            {entregas.map((d) => {
              const ds = DLV_STATUS[d.status];
              return (
                <div
                  key={d.id}
                  className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {deliverableLabel(d.type)}
                        {d.due_date && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            · até{" "}
                            {formatDateBR(d.due_date)}
                          </span>
                        )}
                      </p>
                      {d.description && (
                        <p className="text-muted-foreground text-sm">
                          {d.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${ds?.cls}`}
                    >
                      {ds?.label}
                    </span>
                  </div>

                  {d.deliverable_proofs.length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-sm">
                      {d.deliverable_proofs.map((pr) => (
                        <li key={pr.id}>
                          {pr.kind === "screenshot" ? (
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-border block overflow-hidden rounded-lg border"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={pr.url}
                                alt="Comprovação"
                                className="size-24 object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2"
                            >
                              {pr.kind === "video" ? "Vídeo" : "Link"} de
                              comprovação
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {iAmAthlete &&
                    (d.status === "pending" || d.status === "rejected") && (
                      <ProofForm deliverableId={d.id} sponsorshipId={s.id} />
                    )}

                  {iAmCompany && d.status === "submitted" && (
                    <form
                      action={avaliarEntrega}
                      className="mt-1 flex gap-2"
                    >
                      <input
                        type="hidden"
                        name="deliverable_id"
                        value={d.id}
                      />
                      <input
                        type="hidden"
                        name="sponsorship_id"
                        value={s.id}
                      />
                      <Button
                        type="submit"
                        name="decision"
                        value="approved"
                        size="xs"
                      >
                        Aprovar
                      </Button>
                      <Button
                        type="submit"
                        name="decision"
                        value="rejected"
                        size="xs"
                        variant="ghost"
                      >
                        Recusar
                      </Button>
                    </form>
                  )}

                  {d.status === "pending" && (
                    <form action={removerEntrega}>
                      <input
                        type="hidden"
                        name="deliverable_id"
                        value={d.id}
                      />
                      <input
                        type="hidden"
                        name="sponsorship_id"
                        value={s.id}
                      />
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-destructive text-xs"
                      >
                        Remover
                      </button>
                    </form>
                  )}
                </div>
              );
            })}

            {s.status === "active" && (
              <AddDeliverableForm sponsorshipId={s.id} />
            )}
          </div>
        </section>

        {s.status === "active" && (
          <form action={encerrarPatrocinio} className="mt-8">
            <input type="hidden" name="sponsorship_id" value={s.id} />
            <Button type="submit" variant="outline" size="sm">
              Encerrar patrocínio
            </Button>
          </form>
        )}
      </div>
    </div>
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
