import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDateBR, paymentSummary } from "@/lib/format";
import { timeAgo } from "@/lib/relative-time";
import { deliverableLabel } from "@/lib/deliverables";
import { FACTOR_LABELS, tierInfo, suggestedMonthlyRange } from "@/lib/rank";
import { pickPrimaryModality } from "@/lib/sports";
import type { RankFactors, RankTier } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Painel — Sponsas" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, type, plan")
    .eq("id", user.id)
    .single();

  const primeiroNome = (profile?.name || user.email?.split("@")[0] || "").split(
    " ",
  )[0];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <h1 className="text-4xl">Olá, {primeiroNome}</h1>
        <Link
          href="/configuracoes"
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            profile?.plan === "pro"
              ? "bg-navy text-navy-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {profile?.plan === "pro" ? "PRO" : "Free"}
        </Link>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        {profile?.type === "company"
          ? "Resumo das suas campanhas e patrocínios."
          : "Resumo dos seus patrocínios, entregas e do seu Rank Sponsas."}
      </p>

      {profile?.type === "company" ? (
        <PainelEmpresa userId={user.id} />
      ) : (
        <PainelPiloto userId={user.id} />
      )}
    </div>
  );
}

/* ---------------- KPI ---------------- */
function Kpi({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <div className="border-border bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-[13px]">{label}</p>
      <p className="font-[family-name:var(--font-heading)] mt-1 text-2xl">
        {value}
      </p>
    </div>
  );
  return href ? (
    <Link href={href} className="hover:border-l-primary block rounded-lg">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card rounded-xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------------- PILOTO ---------------- */
async function PainelPiloto({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [
    { data: modalitiesRaw },
    { data: socialsRaw },
    { data: spRaw },
    { data: dlvRaw },
    { data: propRaw },
  ] = await Promise.all([
    supabase
      .from("athlete_modalities")
      .select("modality, rank_score, rank_tier, rank_factors")
      .eq("profile_id", userId),
    supabase
      .from("social_links")
      .select("followers, avg_interactions")
      .eq("profile_id", userId),
    supabase
      .from("sponsorships")
      .select("id, value, status")
      .eq("athlete_id", userId),
    supabase
      .from("deliverables")
      .select("id, type, status, due_date")
      .in("status", ["pending", "submitted"])
      .order("due_date", { nullsFirst: false }),
    supabase
      .from("proposals")
      .select(
        "id, status, value, payment_type, trade_description, trade_value, duration_months, created_at, from:profiles!proposals_from_profile_id_fkey(name)",
      )
      .eq("to_profile_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const socials = (socialsRaw ?? []) as {
    followers: number | null;
    avg_interactions: number | null;
  }[];

  // Rank do painel: a modalidade principal do piloto (maior score).
  const athlete = pickPrimaryModality(
    (modalitiesRaw ?? []) as {
      modality: string;
      rank_score: number | null;
      rank_tier: RankTier | null;
      rank_factors: RankFactors | null;
    }[],
  );
  const sponsorships = (spRaw ?? []) as {
    id: string;
    value: number | null;
    status: string;
  }[];
  const deliverables = (dlvRaw ?? []) as {
    id: string;
    type: string;
    status: string;
    due_date: string | null;
  }[];
  const proposals = (propRaw ?? []) as unknown as {
    id: string;
    value: number | null;
    payment_type: "cash" | "trade" | "mixed";
    trade_description: string | null;
    trade_value: number | null;
    created_at: string;
    from: { name: string | null } | null;
  }[];

  const ativos = sponsorships.filter((s) => s.status === "active");
  const receita = ativos.reduce((sum, s) => sum + (s.value ?? 0), 0);
  const followers = (socials ?? []).reduce((s, l) => s + (l.followers ?? 0), 0);
  const interactions = (socials ?? []).reduce(
    (s, l) => s + (l.avg_interactions ?? 0),
    0,
  );
  const engagement =
    followers > 0 && interactions > 0
      ? Math.min((interactions / followers) * 100, 100)
      : null;

  const tier = tierInfo(athlete?.rank_tier);
  const factors = (athlete?.rank_factors ?? null) as RankFactors | null;
  const range = suggestedMonthlyRange(
    followers,
    engagement,
    athlete?.rank_tier ?? null,
  );

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Rank */}
      <section className="border-primary bg-card rounded-xl border border-l-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-[13px]">Rank Sponsas</p>
            <p className="font-[family-name:var(--font-heading)] text-3xl">
              {tier ? tier.label : "—"}
              {athlete?.rank_score != null && (
                <span className="text-muted-foreground text-lg">
                  {" "}
                  · {athlete.rank_score}/100
                </span>
              )}
            </p>
          </div>
          <Link
            href={`/p/${userId}`}
            className="text-foreground shrink-0 text-sm underline underline-offset-2"
          >
            Ver perfil público
          </Link>
        </div>

        {factors && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(
              [
                "prazo",
                "demanda",
                "engajamento",
                "atividade",
                "perfil",
              ] as const
            ).map((k) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-40 shrink-0">
                  {FACTOR_LABELS[k]}
                </span>
                <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <span
                    className="bg-primary block h-full"
                    style={{ width: `${Math.round((factors[k] ?? 0) * 100)}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        )}

        {factors && (
          <p className="text-muted-foreground mt-3 text-xs">
            {factors.entregas_no_prazo}/{factors.entregas_total} entregas no
            prazo · {factors.entregas_aprovadas} aprovadas. Entregue no prazo e
            cresça o engajamento para subir de rank — isso puxa o valor dos seus
            patrocínios e permutas.
          </p>
        )}

        {range && (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">
              Faixa mensal de referência (estimativa Sponsas):{" "}
            </span>
            <span className="font-medium">
              {formatBRL(range.min)} – {formatBRL(range.max)}
            </span>
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Receita mensal" value={formatBRL(receita)} />
        <Kpi label="Patrocinadores ativos" value={ativos.length} />
        <Kpi
          label="Entregas em aberto"
          value={(deliverables ?? []).length}
          href="/entregas"
        />
        <Kpi
          label="Propostas a responder"
          value={(proposals ?? []).length}
          href="/propostas"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel
          title="Próximas entregas"
          action={
            <Link href="/entregas" className="text-muted-foreground text-xs">
              ver todas
            </Link>
          }
        >
          {(deliverables ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Nada em aberto.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {(deliverables ?? []).slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="flex justify-between gap-3 py-2 text-sm first:pt-0"
                >
                  <span>{deliverableLabel(d.type)}</span>
                  <span className="text-muted-foreground">
                    {d.status === "submitted"
                      ? "em revisão"
                      : d.due_date
                        ? formatDateBR(d.due_date)
                        : "sem prazo"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Propostas recebidas"
          action={
            <Link href="/propostas" className="text-muted-foreground text-xs">
              ver todas
            </Link>
          }
        >
          {(proposals ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma proposta pendente.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {(proposals ?? []).slice(0, 5).map((p) => (
                <li key={p.id} className="py-2 text-sm first:pt-0">
                  <Link
                    href={`/propostas/${p.id}`}
                    className="flex justify-between gap-3 hover:underline"
                  >
                    <span className="font-medium">
                      {(p.from as { name: string | null } | null)?.name ?? "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {timeAgo(p.created_at)}
                    </span>
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {paymentSummary(p)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- EMPRESA ---------------- */
async function PainelEmpresa({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [
    { data: spRaw },
    { data: oppRaw },
    { data: appRaw },
    { data: dlvRaw },
  ] = await Promise.all([
    supabase
      .from("sponsorships")
      .select(
        "id, value, status, athlete:profiles!sponsorships_athlete_id_fkey(id, name, athlete_modalities(rank_tier, rank_score))",
      )
      .eq("company_id", userId),
    supabase
      .from("opportunities")
      .select("id, title, status")
      .eq("company_id", userId),
    supabase
      .from("applications")
      .select(
        "id, created_at, opportunity:opportunities!inner(id, title, company_id), athlete:profiles!applications_athlete_id_fkey(name)",
      )
      .eq("status", "pending")
      .eq("opportunity.company_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("deliverables")
      .select(
        "id, type, status, sponsorship:sponsorships!inner(id, company_id)",
      )
      .eq("status", "submitted")
      .eq("sponsorship.company_id", userId),
  ]);

  const sponsorships = (spRaw ?? []) as unknown as {
    id: string;
    value: number | null;
    status: string;
    athlete: {
      id: string;
      name: string | null;
      athlete_modalities: {
        rank_tier: string | null;
        rank_score: number | null;
      }[];
    } | null;
  }[];
  const opportunities = (oppRaw ?? []) as {
    id: string;
    title: string;
    status: string;
  }[];
  const applications = (appRaw ?? []) as unknown as {
    id: string;
    created_at: string;
    opportunity: { id: string; title: string };
    athlete: { name: string | null } | null;
  }[];
  const deliverables = (dlvRaw ?? []) as unknown as {
    id: string;
    type: string;
    sponsorship: { id: string };
  }[];

  const ativos = sponsorships.filter((s) => s.status === "active");
  const investimento = ativos.reduce((sum, s) => sum + (s.value ?? 0), 0);
  const vagasAbertas = opportunities.filter((o) => o.status === "open").length;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/pilotos">Encontrar pilotos</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Investimento mensal" value={formatBRL(investimento)} />
        <Kpi label="Pilotos patrocinados" value={ativos.length} />
        <Kpi
          label="Oportunidades abertas"
          value={vagasAbertas}
          href="/oportunidades"
        />
        <Kpi
          label="Entregas a aprovar"
          value={(deliverables ?? []).length}
          href="/entregas"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel
          title="Seus pilotos"
          action={
            <Link href="/patrocinios" className="text-muted-foreground text-xs">
              ver todos
            </Link>
          }
        >
          {ativos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum patrocínio ativo.{" "}
              <Link href="/pilotos" className="underline">
                Explorar pilotos
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {ativos.map((s) => {
                const ath = s.athlete as {
                  id: string;
                  name: string | null;
                  athlete_modalities: {
                    rank_tier: string | null;
                    rank_score: number | null;
                  }[];
                } | null;
                const best = pickPrimaryModality(
                  (ath?.athlete_modalities ?? []).map((m) => ({
                    modality: "",
                    rank_score: m.rank_score,
                    rank_tier: m.rank_tier,
                  })),
                );
                const t = tierInfo(best?.rank_tier);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0"
                  >
                    <Link
                      href={`/patrocinios/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {ath?.name ?? "—"}
                    </Link>
                    <span className="flex items-center gap-2">
                      {t && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.badgeCls}`}
                        >
                          {t.label}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {formatBRL(s.value)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Candidaturas a avaliar"
          action={
            <Link
              href="/oportunidades"
              className="text-muted-foreground text-xs"
            >
              ver vagas
            </Link>
          }
        >
          {(applications ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma candidatura pendente.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {(applications ?? []).slice(0, 6).map((a) => {
                const opp = a.opportunity as { id: string; title: string };
                const ath = a.athlete as { name: string | null } | null;
                return (
                  <li key={a.id} className="py-2 text-sm first:pt-0">
                    <Link
                      href={`/oportunidades/${opp.id}`}
                      className="flex justify-between gap-3 hover:underline"
                    >
                      <span className="font-medium">{ath?.name ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {timeAgo(a.created_at)}
                      </span>
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {opp.title}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {(deliverables ?? []).length > 0 && (
        <Panel title="Entregas aguardando sua aprovação">
          <ul className="flex flex-col divide-y">
            {(deliverables ?? []).map((d) => {
              const sp = d.sponsorship as { id: string };
              return (
                <li key={d.id} className="py-2 text-sm first:pt-0">
                  <Link
                    href={`/patrocinios/${sp.id}`}
                    className="hover:underline"
                  >
                    {deliverableLabel(d.type)} — revisar
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <div>
        <Button asChild size="lg">
          <Link href="/oportunidades/nova">Criar oportunidade</Link>
        </Button>
      </div>
    </div>
  );
}
