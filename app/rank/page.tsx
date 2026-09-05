import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tierInfo } from "@/lib/rank";
import {
  MODALITIES,
  MODALITY_VALUES,
  modalityByValue,
  modalityLabel,
  pickPrimaryModality,
} from "@/lib/sports";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import type { RankTier, AthleteRankSnapshot } from "@/lib/types/database.types";

export const metadata: Metadata = {
  title: "Rank Sponsas — Sponsas",
  description:
    "Ranking dos pilotos por reputação na Sponsas: quem entrega no prazo, cumpre a demanda e cresce sobe de posição.",
};

type Periodo = "ranking" | "semana" | "mes";

type ModRow = {
  modality: string;
  rank_tier: RankTier | null;
  rank_score: number | null;
};
type Joined = {
  id: string;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  plan: "free" | "pro";
  athlete_modalities: ModRow[];
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
  searchParams: Promise<{ periodo?: string; modalidade?: string }>;
}) {
  const sp = await searchParams;
  const periodo: Periodo =
    sp.periodo === "semana" || sp.periodo === "mes" ? sp.periodo : "ranking";
  const modFilter =
    sp.modalidade && MODALITY_VALUES.includes(sp.modalidade)
      ? sp.modalidade
      : null;

  const supabase = await createClient();

  const [{ data: athletesData }, { data: snapsData }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, name, photo_url, city, state, plan, athlete_modalities!inner(modality, rank_tier, rank_score)",
      )
      .eq("type", "athlete"),
    supabase
      .from("athlete_rank_snapshots")
      .select("*")
      .gte("captured_on", isoDaysAgo(40)),
  ]);

  const athletes = (athletesData ?? []) as unknown as Joined[];
  const snapshots = (snapsData ?? []) as AthleteRankSnapshot[];

  // Linha de rank de cada piloto para o recorte atual: a modalidade filtrada,
  // senão a principal (maior score).
  type Entry = { a: Joined; mod: ModRow };
  const entries: Entry[] = [];
  const noRank: Joined[] = [];
  for (const a of athletes) {
    const mod = modFilter
      ? (a.athlete_modalities.find((m) => m.modality === modFilter) ?? null)
      : pickPrimaryModality(a.athlete_modalities);
    if (!mod) continue;
    if (mod.rank_score == null) noRank.push(a);
    else entries.push({ a, mod });
  }
  entries.sort((x, y) => (y.mod.rank_score ?? 0) - (x.mod.rank_score ?? 0));

  // Baseline por período: snapshot mais recente <= corte, da mesma modalidade.
  const cutoff = isoDaysAgo(periodo === "mes" ? 30 : 7);
  const snapKey = (athleteId: string, modality: string) =>
    `${athleteId}::${modality}`;
  const byKey = new Map<string, AthleteRankSnapshot[]>();
  for (const s of snapshots) {
    const k = snapKey(s.athlete_id, s.modality ?? "");
    const arr = byKey.get(k) ?? [];
    arr.push(s);
    byKey.set(k, arr);
  }
  const baselineScore = (athleteId: string, modality: string): number | null => {
    const arr = byKey.get(snapKey(athleteId, modality)) ?? [];
    const eligible = arr
      .filter((s) => s.captured_on <= cutoff && s.score != null)
      .sort((a, b) => (a.captured_on < b.captured_on ? 1 : -1));
    return eligible[0]?.score ?? null;
  };

  const baseEntries = entries
    .map((e) => ({
      id: e.a.id,
      score: baselineScore(e.a.id, e.mod.modality),
    }))
    .filter((e): e is { id: string; score: number } => e.score != null)
    .sort((a, b) => b.score - a.score);
  const basePos = new Map(baseEntries.map((e, i) => [e.id, i + 1]));

  const historyExists =
    periodo === "ranking" || snapshots.some((s) => s.captured_on <= cutoff);
  const firstSnapshot =
    snapshots.length > 0
      ? snapshots.map((s) => s.captured_on).sort()[0]
      : null;

  const periodTabs: { key: Periodo; label: string }[] = [
    { key: "ranking", label: "Ranking" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mês" },
  ];

  const qs = (over: { m?: string | null; p?: Periodo }) => {
    const params = new URLSearchParams();
    const m = over.m === undefined ? modFilter : over.m;
    const p = over.p ?? periodo;
    if (m) params.set("modalidade", m);
    if (p !== "ranking") params.set("periodo", p);
    const s = params.toString();
    return s ? `/rank?${s}` : "/rank";
  };

  const modLabel = modalityByValue(modFilter);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Automobilismo
        </p>
        <h1 className="text-4xl">
          Rank Sponsas{modLabel ? ` · ${modLabel.label}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          O piloto acumula pontos entregando no prazo, fechando patrocínios com
          contrato e crescendo o engajamento. A cada faixa de pontos, sobe de
          tier — e cada tier custa mais que o anterior.
        </p>

        {/* Modalidade */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip href={qs({ m: null })} label="Geral" active={!modFilter} />
          {MODALITIES.map((m) => (
            <Chip
              key={m.slug}
              href={qs({ m: m.value })}
              label={m.label}
              active={modFilter === m.value}
            />
          ))}
        </div>

        {/* Período */}
        <div className="mt-4 flex gap-1 border-b">
          {periodTabs.map((t) => (
            <Link
              key={t.key}
              href={qs({ p: t.key })}
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
          {entries.map(({ a, mod }, i) => {
            const pos = i + 1;
            const tier = tierInfo(mod.rank_tier);
            const bp = basePos.get(a.id);
            const move = bp == null ? null : bp - pos;
            const local = [a.city, a.state].filter(Boolean).join(", ");
            const href = modFilter
              ? `/p/${a.id}?modalidade=${encodeURIComponent(modFilter)}`
              : `/p/${a.id}`;
            return (
              <li key={a.id} className="flex items-center gap-4 py-3 first:pt-0">
                <span className="w-8 shrink-0 text-center text-lg font-[family-name:var(--font-heading)]">
                  {MEDAL[i] ?? pos}
                </span>
                <Link href={href} className="shrink-0">
                  <Avatar
                    src={a.photo_url}
                    name={a.name}
                    className="size-10 text-sm"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={href}
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
                    {!modFilter ? `${modalityLabel(mod.modality)} · ` : ""}
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
                {periodo !== "ranking" && (
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

        {entries.length === 0 && (
          <p className="text-muted-foreground mt-8 text-sm">
            Ainda não há pilotos rankeados
            {modLabel ? ` em ${modLabel.label}` : ""}. O rank é calculado
            conforme os pilotos completam o perfil e recebem patrocínios.
          </p>
        )}

        {noRank.length > 0 && (
          <div className="mt-10">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Ainda sem rank
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {noRank.map((a) => (
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

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
