import Link from "next/link";
import { TrophyIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { pickPrimaryModality, modalityLabel } from "@/lib/sports";
import { tierInfo } from "@/lib/rank";
import { formatCompact } from "@/lib/format";
import { PilotCard, type PilotCardData } from "@/components/pilot-card";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RankTier } from "@/lib/types/database.types";

const MES = new Date().toLocaleDateString("pt-BR", { month: "long" });
const POST_PLATFORM: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, name, photo_url, city, state, plan, athlete_modalities!inner(modality, category, rank_tier, rank_score), athlete_cars(photo_url, position, modality), social_links(followers, avg_interactions)",
    )
    .eq("type", "athlete")
    .limit(60);

  type Joined = {
    id: string;
    name: string;
    photo_url: string | null;
    city: string | null;
    state: string | null;
    plan: "free" | "pro";
    athlete_modalities: {
      modality: string;
      category: string | null;
      rank_tier: RankTier | null;
      rank_score: number | null;
    }[];
    athlete_cars: {
      photo_url: string | null;
      position: number;
      modality: string;
    }[];
    social_links: { followers: number | null; avg_interactions: number | null }[];
  };

  const athletes = (data ?? []) as unknown as Joined[];

  const toCard = (p: Joined): PilotCardData & { score: number | null } => {
    const mod = pickPrimaryModality(p.athlete_modalities);
    const followers = p.social_links.reduce((s, l) => s + (l.followers ?? 0), 0);
    const interactions = p.social_links.reduce(
      (s, l) => s + (l.avg_interactions ?? 0),
      0,
    );
    return {
      id: p.id,
      name: p.name,
      photo_url: p.photo_url,
      car_photo_url:
        [...p.athlete_cars]
          .filter((c) => c.modality === mod?.modality)
          .sort((a, b) => a.position - b.position)
          .find((c) => c.photo_url)?.photo_url ?? null,
      city: p.city,
      state: p.state,
      modality: mod?.modality ?? null,
      category: mod?.category ?? null,
      tier: mod?.rank_tier ?? null,
      isPro: p.plan === "pro",
      followers,
      engagement:
        followers > 0 && interactions > 0
          ? Math.min((interactions / followers) * 100, 100)
          : null,
      score: mod?.rank_score ?? null,
    };
  };

  const cards = athletes.map(toCard);
  const top3 = cards
    .filter((c) => c.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
  const destaques: PilotCardData[] = cards.slice(0, 3);

  // Post mais curtido dos últimos 30 dias (por posted_on, ou created_at se vazio)
  const { data: postData } = await supabase
    .from("athlete_posts")
    .select(
      "id, platform, url, likes, image_url, posted_on, created_at, athlete:profiles!athlete_posts_athlete_id_fkey(id, name, photo_url)",
    )
    .order("likes", { ascending: false })
    .limit(30);

  type PostRow = {
    id: string;
    platform: string;
    url: string;
    likes: number;
    image_url: string | null;
    posted_on: string | null;
    created_at: string;
    athlete: { id: string; name: string; photo_url: string | null } | null;
  };
  const cutoff = isoDaysAgo(30);
  const postDoMes = ((postData ?? []) as unknown as PostRow[])
    .filter((p) => (p.posted_on ?? p.created_at.slice(0, 10)) >= cutoff)
    .sort((a, b) => b.likes - a.likes)[0];

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-20">
        <div className="grid items-center gap-14 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Eyebrow>
              {athletes.length > 0
                ? `${athletes.length} pilotos com perfil ativo`
                : "Sponsorship made simple"}
            </Eyebrow>
            <h1 className="mt-4 text-5xl md:text-6xl">
              Patrocínio sem
              <br />
              mensagem no escuro.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-md text-lg leading-relaxed">
              Pilotos organizam seu perfil comercial e suas entregas. Marcas
              encontram quem combina com elas e acompanham cada patrocínio num
              só lugar.
            </p>

            <ul className="mt-7 flex flex-col gap-3">
              {[
                [
                  "Perfil comercial de verdade",
                  "resultados, redes, entregas e uma tabela de preços — não um print de DM.",
                ],
                [
                  "Rank Sponsas",
                  "quem entrega no prazo e cresce sobe de rank — isso guia o valor do patrocínio.",
                ],
                [
                  "Entregas acompanhadas",
                  "cada acordo vira um checklist com comprovação e aprovação da marca.",
                ],
              ].map(([t, d]) => (
                <li key={t} className="flex items-start gap-2.5 text-sm">
                  <span className="bg-primary/15 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{t}:</span>{" "}
                    {d}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-primary/25 bg-primary/5 mt-7 max-w-md rounded-lg border px-4 py-3">
              <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
                Monte o perfil e já apareça pras empresas certas
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/cadastro?tipo=piloto">Criar perfil de piloto</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/para-empresas">Sou uma empresa</Link>
              </Button>
            </div>
          </div>

          {top3.length > 0 ? (
            <RankPodiumCard top3={top3} mes={MES} />
          ) : (
            <ExemploPatrocinio />
          )}
        </div>
      </section>

      {/* Exemplo de patrocínio ativo (quando o Top 3 já ocupa o hero) */}
      {top3.length > 0 && (
        <section className="border-border border-t">
          <div className="mx-auto max-w-[1120px] px-6 py-14">
            <div className="grid items-center gap-10 md:grid-cols-[1fr_0.9fr]">
              <div>
                <Eyebrow>Como um acordo fica na Sponsas</Eyebrow>
                <h2 className="mt-2 text-3xl">Do print de DM a um contrato</h2>
                <p className="text-muted-foreground mt-3 max-w-md">
                  Valor, permuta, duração e entregas — tudo registrado e
                  acompanhado num só lugar.
                </p>
              </div>
              <ExemploPatrocinio />
            </div>
          </div>
        </section>
      )}

      {/* Post do mês */}
      {postDoMes && postDoMes.athlete && (
        <section className="border-border border-t">
          <div className="mx-auto max-w-[1120px] px-6 py-14">
            <Eyebrow>Post do mês</Eyebrow>
            <h2 className="mt-2 text-3xl">O conteúdo mais curtido</h2>
            <a
              href={postDoMes.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border border-l-primary bg-card hover:border-l-primary/60 mt-6 flex flex-col gap-4 rounded-xl border border-l-3 p-5 transition-colors sm:flex-row sm:items-center"
            >
              {postDoMes.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={postDoMes.image_url}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover sm:size-40"
                />
              )}
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={postDoMes.athlete.photo_url}
                    name={postDoMes.athlete.name}
                    className="size-10 text-sm"
                  />
                  <div>
                    <p className="font-semibold">{postDoMes.athlete.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {POST_PLATFORM[postDoMes.platform] ?? postDoMes.platform}
                    </p>
                  </div>
                </div>
                <p className="font-[family-name:var(--font-heading)] text-3xl">
                  {formatCompact(postDoMes.likes)}{" "}
                  <span className="text-muted-foreground text-lg">curtidas</span>
                </p>
                <span className="text-foreground text-sm underline underline-offset-2">
                  Ver post
                </span>
              </div>
            </a>
          </div>
        </section>
      )}

      {/* Como funciona */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-[1120px] px-6 py-20">
          <Eyebrow>Simples assim</Eyebrow>
          <h2 className="mt-3 max-w-xl text-4xl">Como funciona</h2>
          <p className="text-muted-foreground mt-3 max-w-xl">
            Três passos para sair da conversa informal e chegar a um
            patrocínio com entregas combinadas e acompanhadas.
          </p>
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {[
              [
                "1",
                "Monte seu perfil",
                "Resultados, categoria, redes sociais e o tipo de entrega que você oferece a um patrocinador.",
              ],
              [
                "2",
                "Encontre ou seja encontrado",
                "Candidate-se a oportunidades de marcas ou receba propostas diretas — em dinheiro, permuta ou os dois.",
              ],
              [
                "3",
                "Acompanhe as entregas",
                "Cada patrocínio fechado vira uma lista de entregas, com comprovação e aprovação num só lugar.",
              ],
            ].map(([n, t, d]) => (
              <div
                key={n}
                className="border-border bg-card rounded-xl border p-6"
              >
                <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full font-[family-name:var(--font-heading)] text-base font-bold">
                  {n}
                </span>
                <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {d}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/como-funciona"
              className="text-foreground text-sm underline underline-offset-2"
            >
              Ver em detalhe
            </Link>
          </div>
        </div>
      </section>

      {/* Pilotos em destaque */}
      {destaques.length > 0 && (
        <section className="border-border border-t">
          <div className="mx-auto max-w-[1120px] px-6 py-20">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl">Pilotos em destaque</h2>
                <p className="text-muted-foreground mt-3">
                  Perfis prontos para receber propostas.
                </p>
              </div>
              <Link
                href="/pilotos"
                className="text-foreground shrink-0 text-sm underline underline-offset-2"
              >
                Ver todos
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {destaques.map((p) => (
                <PilotCard key={p.id} pilot={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl">Comece com o plano gratuito</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Sem cartão. Suba para o PRO quando precisar de mais.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              asChild
              size="lg"
              className="bg-navy text-navy-foreground hover:bg-navy/90"
            >
              <Link href="/cadastro">Criar conta</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            >
              <Link href="/planos">Ver planos</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

const PODIUM_STYLE: Record<
  number,
  {
    avatar: string;
    ring: string;
    pedestal: string;
    pedestalBg: string;
    medal: string;
  }
> = {
  1: {
    avatar: "size-16 text-sm",
    ring: "ring-amber-300",
    pedestal: "h-16",
    pedestalBg: "from-amber-300/90 to-amber-300/10",
    medal: "🥇",
  },
  2: {
    avatar: "size-12 text-xs",
    ring: "ring-slate-300",
    pedestal: "h-10",
    pedestalBg: "from-slate-300/80 to-slate-300/10",
    medal: "🥈",
  },
  3: {
    avatar: "size-12 text-xs",
    ring: "ring-orange-400",
    pedestal: "h-7",
    pedestalBg: "from-orange-400/80 to-orange-400/10",
    medal: "🥉",
  },
};

function RankPodiumCard({
  top3,
  mes,
}: {
  top3: (PilotCardData & { score: number | null })[];
  mes: string;
}) {
  const ranked = top3.map((p, i) => ({ ...p, place: i + 1 }));
  const order = [2, 1, 3]
    .map((place) => ranked.find((r) => r.place === place))
    .filter((r): r is (typeof ranked)[number] => Boolean(r));

  return (
    <div className="bg-navy text-navy-foreground relative overflow-hidden rounded-2xl p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="bg-primary/25 pointer-events-none absolute -top-20 -right-14 size-52 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <span className="bg-primary/15 text-primary inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold">
          <TrophyIcon className="size-3.5" />
          Rank Sponsas
        </span>
        <span className="text-[11px] text-white/40">Top 3 de {mes}</span>
      </div>

      <div className="relative mt-7 flex items-end justify-center gap-2">
        {order.map((r) => {
          const style = PODIUM_STYLE[r.place];
          return (
            <Link
              key={r.id}
              href={`/p/${r.id}`}
              className="group flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-base leading-none">{style.medal}</span>
              <Avatar
                src={r.photo_url}
                name={r.name}
                tone="primary"
                className={cn(
                  "ring-offset-navy shrink-0 ring-2 ring-offset-2 transition-transform group-hover:-translate-y-1",
                  style.avatar,
                  style.ring,
                )}
              />
              <div className="min-w-0 text-center">
                <p className="max-w-[88px] truncate text-xs font-semibold">
                  {r.name}
                </p>
                <p className="text-[10px] text-white/45">
                  {[modalityLabel(r.modality), tierInfo(r.tier)?.label]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div
                className={cn(
                  "w-full rounded-t-md bg-gradient-to-b",
                  style.pedestal,
                  style.pedestalBg,
                )}
              />
            </Link>
          );
        })}
      </div>

      <p className="relative mt-1 text-center text-[11px] text-white/40">
        Atualizado pelas entregas, engajamento e atividade de cada piloto.
      </p>

      <Link
        href="/rank"
        className="relative mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white"
      >
        Ver ranking completo
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  );
}

/** Pill de eyebrow — ponto + texto tracked em caixa alta, inspirado no CineLook. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-primary/30 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">
      <span className="bg-primary size-1.5 rounded-full" />
      {children}
    </span>
  );
}

function ExemploPatrocinio() {
  return (
    <div className="bg-navy text-navy-foreground rounded-xl p-7">
      <span className="bg-primary/15 text-primary inline-block rounded-md px-2.5 py-1 text-xs font-semibold">
        Exemplo de patrocínio ativo
      </span>
      <h3 className="mt-4 text-2xl">Óleo Rubra × Larissa Farah</h3>
      <p className="text-sm text-white/60">
        Arrancada · Categoria Pro · 6 meses
      </p>
      <dl className="mt-5 text-sm">
        {[
          ["Valor mensal", "R$ 2.000"],
          ["Permuta", "1 jogo de pneus/etapa"],
          ["Entregas este mês", "3 de 5"],
          ["Rank Sponsas do piloto", "Elite"],
        ].map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between border-t border-white/10 py-3"
          >
            <dt className="text-white/60">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
