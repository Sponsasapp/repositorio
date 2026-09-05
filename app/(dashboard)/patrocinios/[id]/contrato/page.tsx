import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatBRL, formatDateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { aceitarContrato } from "../../actions";
import type { Sponsorship, Proposal } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Contrato — Sponsas" };

type Row = Sponsorship & {
  athlete: { id: string; name: string | null } | null;
  company: { id: string; name: string | null } | null;
  proposal: Pick<Proposal, "deliverables" | "message"> | null;
};

function dtBR(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/patrocinios/${id}/contrato`);

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

  const iAmAthlete = s.athlete_id === user.id;
  const myAcceptedAt = iAmAthlete ? s.athlete_accepted_at : s.company_accepted_at;
  const otherAcceptedAt = iAmAthlete
    ? s.company_accepted_at
    : s.athlete_accepted_at;
  const bothIn = !!s.athlete_accepted_at && !!s.company_accepted_at;
  const cancelled = s.status === "cancelled";
  const closed = s.status === "ended" || cancelled;
  const agreed = s.proposal?.deliverables ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/patrocinios/${id}`}
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Voltar ao patrocínio
      </Link>

      <div className="border-border bg-card mt-4 rounded-xl border">
        <div className="border-border border-b px-6 py-5">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            Contrato de patrocínio
          </p>
          <h1 className="mt-1 text-2xl">
            {s.company?.name ?? "—"} × {s.athlete?.name ?? "—"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registrado em {formatDateBR(s.created_at.slice(0, 10))}
          </p>
        </div>

        <dl className="flex flex-col divide-y text-sm">
          <Row2 k="Empresa">
            <Link href={`/e/${s.company?.id}`} className="underline">
              {s.company?.name ?? "—"}
            </Link>
          </Row2>
          <Row2 k="Piloto">
            <Link href={`/p/${s.athlete?.id}`} className="underline">
              {s.athlete?.name ?? "—"}
            </Link>
          </Row2>
          <Row2 k="Valor mensal">
            {s.value != null ? `${formatBRL(s.value)} / mês` : "—"}
          </Row2>
          {(s.payment_type === "trade" || s.payment_type === "mixed") && (
            <Row2 k="Permuta">
              {s.trade_description ?? "—"}
              {s.trade_value != null && (
                <span className="text-muted-foreground">
                  {" "}
                  · valor estimado {formatBRL(s.trade_value)}
                </span>
              )}
            </Row2>
          )}
          <Row2 k="Duração">
            {s.duration_months != null ? `${s.duration_months} meses` : "—"}
          </Row2>
          <Row2 k="Início">{formatDateBR(s.start_date)}</Row2>
          <Row2 k="Entregas combinadas">
            {agreed.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {agreed.map((d) => (
                  <span
                    key={d}
                    className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                  >
                    {deliverableLabel(d)}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )}
          </Row2>
          {s.proposal?.message && (
            <Row2 k="Observações">{s.proposal.message}</Row2>
          )}
        </dl>

        <div className="border-border border-t px-6 py-5">
          <p className="text-sm font-semibold">Aceite das partes</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            O patrocínio só vale como acordo formal depois que as duas partes
            clicam &ldquo;De acordo&rdquo; com os termos acima.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <AcceptRow
              nome={s.company?.name ?? "Empresa"}
              acceptedAt={s.company_accepted_at}
            />
            <AcceptRow
              nome={s.athlete?.name ?? "Piloto"}
              acceptedAt={s.athlete_accepted_at}
            />
          </div>

          {cancelled ? (
            <p className="text-destructive mt-4 text-sm">
              Contrato cancelado — uma das partes não concordou com os termos.
            </p>
          ) : bothIn ? (
            <p className="text-success mt-4 text-sm">
              Contrato de acordo pelas duas partes.
            </p>
          ) : closed ? null : myAcceptedAt ? (
            <p className="text-muted-foreground mt-4 text-sm">
              Você aceitou em {dtBR(myAcceptedAt)}. Aguardando{" "}
              {otherAcceptedAt ? "" : "a outra parte"}.
            </p>
          ) : (
            <form
              action={aceitarContrato}
              className="mt-4 flex flex-wrap gap-2"
            >
              <input type="hidden" name="sponsorship_id" value={id} />
              <Button type="submit" name="accept" value="1">
                De acordo com os termos
              </Button>
              <Button type="submit" name="accept" value="0" variant="outline">
                Não concordo
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Row2({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 px-6 py-3">
      <dt className="text-muted-foreground shrink-0">{k}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function AcceptRow({
  nome,
  acceptedAt,
}: {
  nome: string;
  acceptedAt: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span
        className={
          acceptedAt
            ? "flex items-center gap-1.5 font-medium"
            : "text-muted-foreground flex items-center gap-1.5"
        }
      >
        {acceptedAt && (
          <span className="bg-success/15 text-success flex size-4 items-center justify-center rounded-full">
            <CheckIcon className="size-2.5" strokeWidth={3} />
          </span>
        )}
        {nome}
      </span>
      <span className="text-muted-foreground text-xs">
        {acceptedAt
          ? new Date(acceptedAt).toLocaleDateString("pt-BR")
          : "aguardando"}
      </span>
    </div>
  );
}
