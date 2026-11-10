import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { aceitarContrato } from "../../actions";
import { PARTICIPANT } from "@/lib/participant-types";
import {
  CONTRACT_VERSION,
  contractClauses,
  loadContractTerms,
  termsHash,
} from "@/lib/contract";
import type {
  ContractAcceptance,
  ProfileType,
  Sponsorship,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Contrato — Sponsas" };

type Row = Sponsorship & {
  athlete: { id: string; name: string | null; type: ProfileType } | null;
  company: { id: string; name: string | null } | null;
};

function dtBR(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} às ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
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

  const [{ data }, terms, { data: acceptRows }] = await Promise.all([
    supabase
      .from("sponsorships")
      .select(
        "*, athlete:profiles!sponsorships_athlete_id_fkey(id, name, type), company:profiles!sponsorships_company_id_fkey(id, name)",
      )
      .eq("id", id)
      .maybeSingle(),
    loadContractTerms(supabase, id),
    supabase.from("contract_acceptances").select("*").eq("sponsorship_id", id),
  ]);
  if (!data || !terms) notFound();
  const s = data as unknown as Row;
  if (s.athlete_id !== user.id && s.company_id !== user.id) notFound();

  const sponseeType = s.athlete?.type ?? "athlete";
  const sponseeLabel = PARTICIPANT[sponseeType].label;
  const iAmSponsee = s.athlete_id === user.id;
  const myAcceptedAt = iAmSponsee ? s.athlete_accepted_at : s.company_accepted_at;
  const bothIn = !!s.athlete_accepted_at && !!s.company_accepted_at;
  const cancelled = s.status === "cancelled";
  const closed = s.status === "ended" || cancelled;

  const myParty = iAmSponsee ? terms.sponsee : terms.company;
  const myLegalOk = Boolean(myParty?.complete);
  const hash = termsHash(terms);
  const trail = (acceptRows ?? []) as ContractAcceptance[];
  const trailOf = (pid: string | undefined) =>
    trail.find((a) => a.profile_id === pid) ?? null;

  const companyName = s.company?.name ?? "Empresa";
  const sponseeName = s.athlete?.name ?? sponseeLabel;
  const { parties, clauses } = contractClauses(terms, {
    company: companyName,
    sponsee: sponseeName,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/patrocinios/${id}`}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Voltar ao patrocínio
        </Link>
        <PrintButton />
      </div>

      <article className="border-border bg-card mt-4 rounded-xl border print:mt-0 print:rounded-none print:border-0">
        <header className="border-border border-b px-6 py-5">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            Contrato de patrocínio
          </p>
          <h1 className="mt-1 text-2xl">
            {companyName} × {sponseeName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registrado em {formatDateBR(s.created_at.slice(0, 10))} · modelo{" "}
            {CONTRACT_VERSION}
          </p>
        </header>

        <section className="border-border flex flex-col gap-3 border-b px-6 py-5 text-sm">
          <h2 className="text-base font-semibold">Partes</h2>
          {parties.map((p) => (
            <p key={p.label} className="leading-relaxed">
              <span className="font-semibold">{p.label}: </span>
              {p.text}
            </p>
          ))}
          <p className="text-muted-foreground text-xs">
            As partes acima celebram o presente contrato de patrocínio, que se
            rege pelas cláusulas a seguir.
          </p>
        </section>

        <section className="flex flex-col gap-5 px-6 py-5 text-sm">
          {clauses.map((c) => (
            <div key={c.title} className="break-inside-avoid">
              <h3 className="font-semibold">{c.title}</h3>
              {c.paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-foreground/90 mt-1.5 leading-relaxed whitespace-pre-line"
                >
                  {para}
                </p>
              ))}
            </div>
          ))}
          <p className="text-muted-foreground border-border border-t pt-4 text-xs">
            Modelo padrão oferecido pela Sponsas. Não substitui orientação
            jurídica — as partes podem registrar condições adicionais na
            proposta antes de aceitar. Código de integridade dos termos:{" "}
            <span className="font-mono break-all">{hash}</span>
          </p>
        </section>

        <section className="border-border border-t px-6 py-5 break-inside-avoid">
          <h2 className="text-sm font-semibold">Aceite das partes</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            O patrocínio só vale como acordo formal depois que as duas partes
            dão o &ldquo;de acordo&rdquo; com os termos acima.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <AcceptRow
              papel="PATROCINADORA"
              nome={companyName}
              acceptedAt={s.company_accepted_at}
              trail={trailOf(s.company?.id)}
            />
            <AcceptRow
              papel="PATROCINADO"
              nome={sponseeName}
              acceptedAt={s.athlete_accepted_at}
              trail={trailOf(s.athlete?.id)}
            />
          </div>

          <div className="print:hidden">
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
                Você aceitou em {dtBR(myAcceptedAt)}. Aguardando a outra parte.
              </p>
            ) : !myLegalOk ? (
              <div className="border-primary/30 bg-primary/5 mt-4 rounded-lg border p-4 text-sm">
                <p className="font-medium">
                  Preencha seus dados para contrato antes de aceitar.
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {iAmSponsee && sponseeType === "athlete"
                    ? "Nome completo, CPF e endereço vão na qualificação das partes."
                    : "Razão social, CNPJ (ou CPF), representante e endereço vão na qualificação das partes."}
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/perfil/dados">Preencher dados</Link>
                </Button>
              </div>
            ) : (
              <form
                action={aceitarContrato}
                className="mt-4 flex flex-wrap gap-2"
              >
                <input type="hidden" name="sponsorship_id" value={id} />
                <SubmitButton name="accept" value="1">
                  De acordo com os termos
                </SubmitButton>
                <SubmitButton
                  name="accept"
                  value="0"
                  variant="outline"
                  confirm="Cancelar o contrato? O patrocínio é desfeito e a proposta volta a ficar retirada."
                >
                  Não concordo
                </SubmitButton>
              </form>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}

function AcceptRow({
  papel,
  nome,
  acceptedAt,
  trail,
}: {
  papel: string;
  nome: string;
  acceptedAt: string | null;
  trail: ContractAcceptance | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
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
        <span>
          <span className="text-muted-foreground text-xs">{papel} · </span>
          {nome}
        </span>
      </span>
      <span className="text-muted-foreground text-right text-xs">
        {acceptedAt ? (
          <>
            de acordo em {dtBR(acceptedAt)}
            {trail?.ip && (
              <span className="block">IP {trail.ip}</span>
            )}
          </>
        ) : (
          "aguardando"
        )}
      </span>
    </div>
  );
}
