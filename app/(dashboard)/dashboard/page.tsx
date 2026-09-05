import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDateBR, paymentSummary } from "@/lib/format";
import { timeAgo } from "@/lib/relative-time";
import { deliverableLabel } from "@/lib/deliverables";
import {
  POINT_LABELS,
  tierInfo,
  tierProgress,
  suggestedMonthlyRange,
  DEFAULT_RANK_CONFIG,
} from "@/lib/rank";
import { pickPrimaryModality } from "@/lib/sports";
import type {
  RankFactors,
  RankTier,
  RankConfig,
} from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard — Sponsas" };

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
          : profile?.type === "athlete"
            ? "Resumo dos seus patrocínios, entregas e do seu Rank Sponsas."
            : "Resumo dos seus patrocínios e entregas."}
      </p>

      {profile?.type === "company" ? (
        <PainelEmpresa userId={user.id} />
      ) : profile?.type === "athlete" ? (
        <PainelPiloto userId={user.id} />
      ) : (
        <PainelSponsee
          userId={user.id}
          type={profile?.type ?? "track"}
        />
      )}
    </div>
  );
}

/* ---------------- PISTA / EVENTO / MÍDIA ---------------- */
async function PainelSponsee({
  userId,
  type,
}: {
  userId: string;
  type: string;
}) {
  const supabase = await createClient();
  const [{ data: spRaw }, { data: profRow }] = await Promise.all([
    supabase
      .from("sponsorships")
      .select("id, value, status, athlete_accepted_at, company_accepted_at")
      .eq("athlete_id", userId),
    supabase
      .from(
        type === "track"
          ? "track_profiles"
          : type === "event"
            ? "event_profiles"
            : "media_profiles",
      )
      .select("profile_id")
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);
  const sps = (spRaw ?? []) as {
    id: string;
    value: number | null;
    status: string;
    athlete_accepted_at: string | null;
    company_accepted_at: string | null;
  }[];
  const ativos = sps.filter(
    (s) => s.status === "active" && s.athlete_accepted_at && s.company_accepted_at,
  );
  const receita = ativos.reduce((sum, s) => sum + (s.value ?? 0), 0);

  return (
    <div className="mt-8 flex flex-col gap-6">
      {!profRow && (
        <Link
          href="/perfil"
          className="border-primary/30 bg-primary/5 hover:bg-primary/10 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors"
        >
          <span className="font-medium">
            Complete seu perfil pras marcas te encontrarem
          </span>
          <span className="text-primary shrink-0">Preencher →</span>
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Receita mensal" value={formatBRL(receita)} />
        <Kpi label="Patrocínios ativos" value={ativos.length} />
        <Kpi label="Entregas" value={0} href="/entregas" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/empresas">Encontrar patrocinadores</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/perfil">Editar perfil</Link>
        </Button>
      </div>
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
    { data: cfgRaw },
    { data: docRaw },
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
      .select("id, value, status, athlete_accepted_at, company_accepted_at")
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
    supabase.from("rank_config").select("*").limit(1).maybeSingle(),
    supabase
      .from("athlete_documents")
      .select("profile_id")
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  const rankCfg = (cfgRaw as RankConfig | null) ?? DEFAULT_RANK_CONFIG;
  const semDados = !docRaw;

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
    athlete_accepted_at: string | null;
    company_accepted_at: string | null;
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

  const ativos = sponsorships.filter(
    (s) =>
      s.status === "active" &&
      s.athlete_accepted_at &&
      s.company_accepted_at,
  );
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
  const points = athlete?.rank_score ?? 0;
  const prog = tierProgress(points, rankCfg);
  const range = suggestedMonthlyRange(
    followers,
    engagement,
    athlete?.rank_tier ?? null,
  );

  return (
    <div className="mt-8 flex flex-col gap-6">
      {semDados && (
        <Link
          href="/perfil/dados"
          className="border-primary/30 bg-primary/5 hover:bg-primary/10 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors"
        >
          <span className="font-medium">
            Complete seus dados pessoais (CPF, RG, endereço)
          </span>
          <span className="text-primary shrink-0">Preencher →</span>
        </Link>
      )}

      {/* Rank */}
      <section className="border-primary bg-card rounded-xl border border-l-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-[13px]">Rank Sponsas</p>
            <p className="font-[family-name:var(--font-heading)] text-3xl">
              {tier ? tier.label : "—"}
              <span className="text-muted-foreground text-lg">
                {" "}
                · {points} pts
              </span>
            </p>
          </div>
          <Link
            href={`/p/${userId}`}
            className="text-foreground shrink-0 text-sm underline underline-offset-2"
          >
            Ver perfil público
          </Link>
        </div>

        {/* Barra de progresso pro próximo tier */}
        <div className="mt-4">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>{tierInfo(prog.tier)?.label}</span>
            <span>
              {prog.nextTier
                ? `faltam ${prog.toNext} pts pro ${tierInfo(prog.nextTier)?.label}`
                : "topo do rank"}
            </span>
          </div>
          <span className="bg-muted mt-1.5 block h-2.5 overflow-hidden rounded-full">
            <span
              className="bg-primary block h-full rounded-full"
              style={{ width: `${prog.pct}%` }}
            />
          </span>
          {prog.nextTier && (
            <p className="text-muted-foreground mt-1 text-[11px]">
              {prog.currentAt} pts → {prog.nextAt} pts · o próximo tier custa mais
              que o anterior.
            </p>
          )}
        </div>

        {factors && (
          <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
            {(Object.keys(POINT_LABELS) as (keyof RankFactors)[]).map((k) => {
              const v = factors[k] ?? 0;
              if (v === 0) return null;
              const neg = k === "penalidades";
              return (
                <li key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{POINT_LABELS[k]}</span>
                  <span
                    className={
                      neg
                        ? "text-destructive font-medium"
                        : "text-foreground font-medium"
                    }
                  >
                    {neg ? "−" : "+"}
                    {v}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {factors && (
          <p className="text-muted-foreground mt-3 text-xs">
            {factors.qt_entregas_prazo}/{factors.qt_entregas_total} entregas
            aprovadas no prazo · {factors.qt_patrocinios} patrocínio(s) ativo(s).
            Entregar no prazo e fechar patrocínios com contrato é o que mais
            soma pontos.
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
        "id, value, status, athlete_accepted_at, company_accepted_at, athlete:profiles!sponsorships_athlete_id_fkey(id, name, athlete_modalities(rank_tier, rank_score))",
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
    athlete_accepted_at: string | null;
    company_accepted_at: string | null;
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

  const ativos = sponsorships.filter(
    (s) =>
      s.status === "active" &&
      s.athlete_accepted_at &&
      s.company_accepted_at,
  );
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
