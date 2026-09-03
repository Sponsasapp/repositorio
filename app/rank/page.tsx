import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/format";
import { tierInfo } from "@/lib/rank";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import type { RankTier, AthleteRankSnapshot } from "@/lib/types/database.types";

export const metadata: Metadata = {
  title: "Rank Sponsas — Sponsas",
  description:
    "Ranking dos pilotos por reputação na Sponsas: quem entrega no prazo, cumpre a demanda e cresce sobe de posição.",
};

type Periodo = "geral" | "semana" | "mes";

type Joined = {
  id: string;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  plan: "free" | "pro";
  athlete_profiles: {
    rank_tier: RankTier | null;
    rank_score: number | null;
  } | null;
};

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sp = await searchParams;
  const periodo: Periodo =
    sp.periodo === "semana" || sp.periodo === "mes" ? sp.periodo : "geral";

  const supabase = await createClient();

  const [{ data: athletesData }, { data: snapsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, name, photo_url, city, state, plan, athlete_profiles!inner(rank_tier, rank_score)",
      )
      .eq("type", "athlete"),
    supabase
      .from("athlete_rank_snapshots")
      .select("*")
      .gte("captured_on", isoDaysAgo(40)),
  ]);

  const athletes = (athletesData ?? []) as unknown as Joined[];
  const snapshots = (snapsData ?? []) as AthleteRankSnapshot[];

  // Ranking atual — só quem já tem score. Sem score vai pro fim, sem posição.
  const ranked = athletes
    .filter((a) => a.athlete_profiles?.rank_score != null)
    .sort(
      (a, b) =>
        (b.athlete_profiles?.rank_score ?? 0) -
        (a.athlete_profiles?.rank_score ?? 0),
    );
  const unranked = athletes.filter(
    (a) => a.athlete_profiles?.rank_score == null,
  );

  // Baseline por período (snapshot mais recente com captured_on <= corte).
  const cutoff = isoDaysAgo(periodo === "mes" ? 30 : 7);
  const byAthlete = new Map<string, AthleteRankSnapshot[]>();
  for (const s of snapshots) {
    const arr = byAthlete.get(s.athlete_id) ?? [];
    arr.push(s);
    byAthlete.set(s.athlete_id, arr);
  }
  const baselineScore = (athleteId: string): number | null => {
    const arr = byAthlete.get(athleteId) ?? [];
    const eligible = arr
      .filter((s) => s.captured_on <= cutoff && s.score != null)
      .sort((a, b) => (a.captured_on < b.captured_on ? 1 : -1));
    return eligible[0]?.score ?? null;
  };

  const baseEntries = ranked
    .map((a) => ({ id: a.id, score: baselineScore(a.id) }))
    .filter((e): e is { id: string; score: number } => e.score != null)
    .sort((a, b) => b.score - a.score);
  const basePos = new Map(baseEntries.map((e, i) => [e.id, i + 1]));

  const historyExists =
    periodo === "geral" || snapshots.some((s) => s.captured_on <= cutoff);
  const firstSnapshot =
    snapshots.length > 0
      ? snapshots
          .map((s) => s.captured_on)
          .sort()[0]
      : null;

  const tabs: { key: Periodo; label: string }[] = [
    { key: "geral", label: "Geral" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mês" },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl">Rank Sponsas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reputação do piloto na plataforma: entrega no prazo, cumprimento da
          demanda, engajamento e atividade. Quem entrega, sobe.
        </p>

        <div className="mt-6 flex gap-1 border-b">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.key === "geral" ? "/rank" : `/rank?periodo=${t.key}`}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
                periodo === t.key
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {!historyExists && (
          <p className="border-border bg-card text-muted-foreground mt-4 rounded-md border-l-2 px-3 py-2 text-xs">
            O histórico do rank começou a ser registrado
            {firstSnapshot ? ` em ${fmtDate(firstSnapshot)}` : " agora"}. O
            movimento {periodo === "mes" ? "do mês" : "da semana"} aparece assim
            que houver {periodo === "mes" ? "30" : "7"} dias de dados.
          </p>
        )}

        <ol className="mt-6 flex flex-col divide-y">
          {ranked.map((a, i) => {
            const pos = i + 1;
            const tier = tierInfo(a.athlete_profiles?.rank_tier);
            const bp = basePos.get(a.id);
            const move = bp == null ? null : bp - pos;
            const local = [a.city, a.state].filter(Boolean).join(", ");
            return (
              <li
                key={a.id}
                className="flex items-center gap-4 py-3 first:pt-0"
              >
                <span className="w-8 shrink-0 text-center text-lg font-[family-name:var(--font-heading)]">
                  {MEDAL[i] ?? pos}
                </span>
                <Link
                  href={`/p/${a.id}`}
                  className="bg-navy text-navy-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm"
                >
                  {a.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.photo_url}
                      alt={a.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-heading)]">
                      {initials(a.name)}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/p/${a.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {a.name}
                    </Link>
                    {a.plan === "pro" && (
                      <span className="bg-bege text-bege-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {local || "—"}
                  </p>
                </div>
                {tier && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      tier.badgeCls,
                    )}
                  >
                    {tier.label}
                  </span>
                )}
                {periodo !== "geral" && (
                  <span className="w-14 shrink-0 text-right text-xs font-medium">
                    {move == null ? (
                      <span className="text-muted-foreground">novo</span>
                    ) : move > 0 ? (
                      <span className="text-success">▲ {move}</span>
                    ) : move < 0 ? (
                      <span className="text-destructive">▼ {-move}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {ranked.length === 0 && (
          <p className="text-muted-foreground mt-8 text-sm">
            Ainda não há pilotos rankeados. O rank é calculado conforme os
            pilotos completam o perfil e recebem patrocínios.
          </p>
        )}

        {unranked.length > 0 && (
          <div className="mt-10">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Ainda sem rank
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {unranked.map((a) => (
                <Link
                  key={a.id}
                  href={`/p/${a.id}`}
                  className="border-border text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-xs"
                >
                  {a.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
