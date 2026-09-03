import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatBRL } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { matchesCampaignRegion } from "@/lib/regions";
import { timeAgo } from "@/lib/relative-time";
import {
  responderCandidatura,
  alternarStatusOportunidade,
} from "../actions";
import { ApplyForm } from "./apply-form";
import { Button } from "@/components/ui/button";
import { RegionFit } from "@/components/region-fit";
import { AppShell } from "@/components/app-shell";
import type { Opportunity } from "@/lib/types/database.types";

type OppWithCompany = Opportunity & {
  company: { name: string | null; city: string | null; state: string | null } | null;
};
type ApplicationRow = {
  id: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  athlete: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    photo_url: string | null;
  } | null;
};

const APP_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  accepted: { label: "Aceita", cls: "bg-success-soft text-success" },
  rejected: { label: "Recusada", cls: "bg-muted text-muted-foreground" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("opportunities")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return { title: data ? `${data.title} — Sponsas` : "Oportunidade — Sponsas" };
}

export default async function OportunidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: oppData } = await supabase
    .from("opportunities")
    .select("*, company:profiles(name, city, state)")
    .eq("id", id)
    .maybeSingle();

  if (!oppData) notFound();
  const opp = oppData as unknown as OppWithCompany;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myType: string | null = null;
  let myState: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("type, state")
      .eq("id", user.id)
      .single();
    myType = profile?.type ?? null;
    myState = profile?.state ?? null;
  }

  const isOwner = user?.id === opp.company_id;
  const isAthlete = myType === "athlete";
  const regionFit = isAthlete
    ? matchesCampaignRegion(myState, opp.region)
    : null;

  // Candidatos (só o dono enxerga, por RLS)
  const { data: applicationsData } = isOwner
    ? await supabase
        .from("applications")
        .select(
          "id, message, status, created_at, athlete:profiles(id, name, city, state, photo_url)",
        )
        .eq("opportunity_id", id)
        .order("created_at", { ascending: false })
    : { data: null };
  const applications = (applicationsData ?? null) as ApplicationRow[] | null;

  // Candidatura do próprio piloto
  const { data: myApplication } =
    isAthlete && user
      ? await supabase
          .from("applications")
          .select("status, message, created_at")
          .eq("opportunity_id", id)
          .eq("athlete_id", user.id)
          .maybeSingle()
      : { data: null };

  const company = opp.company;
  const local = [company?.city, company?.state].filter(Boolean).join(", ");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/oportunidades"
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          ← Oportunidades
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl">{opp.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {company?.name ?? "Empresa"}
              {local ? ` · ${local}` : ""} · publicada {timeAgo(opp.created_at)}
            </p>
          </div>
          {opp.status === "closed" && (
            <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-3 py-1 text-xs">
              Encerrada
            </span>
          )}
        </div>

        <div className="border-border bg-card mt-6 rounded-xl border p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs">Orçamento</dt>
              <dd className="font-[family-name:var(--font-heading)] text-xl">
                {opp.budget != null ? `${formatBRL(opp.budget)}/mês` : "a combinar"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Duração</dt>
              <dd className="font-[family-name:var(--font-heading)] text-xl">
                {opp.duration_months != null
                  ? `${opp.duration_months} meses`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Região</dt>
              <dd className="font-[family-name:var(--font-heading)] text-xl">
                {opp.region ?? "—"}
              </dd>
            </div>
          </dl>

          {opp.expected_deliverables && opp.expected_deliverables.length > 0 && (
            <div className="mt-5">
              <p className="text-muted-foreground mb-2 text-xs">
                Entregas esperadas
              </p>
              <div className="flex flex-wrap gap-2">
                {opp.expected_deliverables.map((d: string) => (
                  <span
                    key={d}
                    className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {deliverableLabel(d)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {opp.description && (
            <p className="mt-5 text-sm leading-relaxed whitespace-pre-line">
              {opp.description}
            </p>
          )}
        </div>

        {regionFit !== null && (
          <div className="mt-4">
            <RegionFit fit={regionFit} region={opp.region} />
          </div>
        )}

        {/* --- Ações do piloto --- */}
        {!user && (
          <div className="mt-6 flex items-center gap-3">
            <Button asChild size="lg">
              <Link href={`/login?next=/oportunidades/${id}`}>
                Entrar para se candidatar
              </Link>
            </Button>
          </div>
        )}

        {isAthlete && opp.status === "open" && (
          <section className="mt-6">
            <h2 className="mb-3 text-xl">Sua candidatura</h2>
            {myApplication ? (
              <div className="border-border bg-card rounded-lg border p-4 text-sm">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    APP_STATUS[myApplication.status]?.cls
                  }`}
                >
                  {APP_STATUS[myApplication.status]?.label}
                </span>
                {myApplication.message && (
                  <p className="text-muted-foreground mt-2 whitespace-pre-line">
                    “{myApplication.message}”
                  </p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  Enviada {timeAgo(myApplication.created_at)}
                </p>
                {myApplication.status === "accepted" && (
                  <div className="mt-3">
                    <Button asChild size="sm">
                      <Link
                        href={`/propostas/nova?para=${opp.company_id}&oportunidade=${id}`}
                      >
                        Enviar proposta
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <ApplyForm opportunityId={id} />
            )}
          </section>
        )}

        {isAthlete && opp.status === "closed" && !myApplication && (
          <p className="text-muted-foreground mt-6 text-sm">
            Esta oportunidade está encerrada.
          </p>
        )}

        {/* --- Painel do dono --- */}
        {isOwner && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">
                Candidaturas ({applications?.length ?? 0})
              </h2>
              <form action={alternarStatusOportunidade}>
                <input type="hidden" name="opportunity_id" value={id} />
                <input
                  type="hidden"
                  name="next"
                  value={opp.status === "open" ? "closed" : "open"}
                />
                <Button type="submit" variant="outline" size="sm">
                  {opp.status === "open" ? "Encerrar vaga" : "Reabrir vaga"}
                </Button>
              </form>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {(applications ?? []).length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Ninguém se candidatou ainda.
                </p>
              )}
              {(applications ?? []).map((app) => {
                const athlete = app.athlete;
                return (
                  <div
                    key={app.id}
                    className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={athlete?.photo_url}
                        name={athlete?.name ?? "?"}
                        className="size-9 text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/p/${athlete?.id}`}
                          className="font-medium hover:underline"
                        >
                          {athlete?.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {[athlete?.city, athlete?.state]
                            .filter(Boolean)
                            .join(", ") || "—"}{" "}
                          · {timeAgo(app.created_at)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          APP_STATUS[app.status]?.cls
                        }`}
                      >
                        {APP_STATUS[app.status]?.label}
                      </span>
                    </div>

                    {app.message && (
                      <p className="text-muted-foreground text-sm whitespace-pre-line">
                        “{app.message}”
                      </p>
                    )}

                    {app.status === "pending" && (
                      <form
                        action={responderCandidatura}
                        className="flex gap-2"
                      >
                        <input
                          type="hidden"
                          name="application_id"
                          value={app.id}
                        />
                        <input
                          type="hidden"
                          name="opportunity_id"
                          value={id}
                        />
                        <Button
                          type="submit"
                          name="decision"
                          value="accepted"
                          size="sm"
                        >
                          Aceitar
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="rejected"
                          size="sm"
                          variant="ghost"
                        >
                          Recusar
                        </Button>
                      </form>
                    )}

                    {app.status === "accepted" && athlete && (
                      <Button asChild size="sm" className="self-start">
                        <Link
                          href={`/propostas/nova?para=${athlete.id}&oportunidade=${id}`}
                        >
                          Enviar proposta
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
