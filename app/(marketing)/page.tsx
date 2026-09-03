import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pickPrimaryModality, modalityLabel } from "@/lib/sports";
import { tierInfo } from "@/lib/rank";
import { formatCompact } from "@/lib/format";
import { PilotCard, type PilotCardData } from "@/components/pilot-card";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import type { RankTier } from "@/lib/types/database.types";

const MEDAL = ["🥇", "🥈", "🥉"];
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
            <h1 className="text-5xl md:text-6xl">
              Patrocínio sem
              <br />
              mensagem no escuro.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-md text-lg leading-relaxed">
              Pilotos organizam seu perfil comercial e suas entregas. Marcas
              encontram quem combina com elas e acompanham cada patrocínio num
              só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/cadastro?tipo=piloto">Criar perfil de piloto</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/para-empresas">Sou uma empresa</Link>
              </Button>
            </div>
          </div>

          {top3.length > 0 ? (
            <div className="bg-navy text-navy-foreground rounded-xl p-7">
              <span className="bg-primary/15 text-primary inline-block rounded-md px-2.5 py-1 text-xs font-semibold">
                Rank Sponsas · Top 3 de {MES}
              </span>
              <ol className="mt-5 flex flex-col divide-y divide-white/10">
                {top3.map((p, i) => {
                  const t = tierInfo(p.tier);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/p/${p.id}`}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="font-[family-name:var(--font-heading)] text-xl">
                          {MEDAL[i]}
                        </span>
                        <Avatar
                          src={p.photo_url}
                          name={p.name}
                          className="size-9 shrink-0 text-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {p.name}
                          </p>
                          <p className="text-xs text-white/50">
                            {[modalityLabel(p.modality), t?.label]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              <Link
                href="/rank"
                className="mt-4 inline-block text-sm text-white/70 underline underline-offset-2 hover:text-white"
              >
                Ver ranking completo
              </Link>
            </div>
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
                <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                  Como um acordo fica na Sponsas
                </p>
                <h2 className="mt-1 text-3xl">Do print de DM a um contrato</h2>
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
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">
              Post do mês
            </p>
            <h2 className="mt-1 text-3xl">O conteúdo mais curtido</h2>
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

      {/* Value strip */}
      <section className="border-border border-y">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-6 py-10 sm:grid-cols-3">
          {[
            [
              "Perfil comercial de verdade",
              "Resultados, redes, entregas e uma tabela de preços — não um print de DM.",
            ],
            [
              "Rank Sponsas",
              "Quem entrega no prazo e cresce sobe de rank. Isso guia o valor do patrocínio.",
            ],
            [
              "Entregas acompanhadas",
              "Cada acordo vira um checklist com comprovação e aprovação da marca.",
            ],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-semibold">{t}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-[1120px] px-6 py-20">
        <h2 className="max-w-xl text-4xl">Como funciona</h2>
        <p className="text-muted-foreground mt-3 max-w-xl">
          Três passos para sair da conversa informal e chegar a um patrocínio
          com entregas combinadas e acompanhadas.
        </p>
        <div className="mt-12 grid gap-7 md:grid-cols-3">
          {[
            [
              "01",
              "Monte seu perfil",
              "Resultados, categoria, redes sociais e o tipo de entrega que você oferece a um patrocinador.",
            ],
            [
              "02",
              "Encontre ou seja encontrado",
              "Candidate-se a oportunidades de marcas ou receba propostas diretas — em dinheiro, permuta ou os dois.",
            ],
            [
              "03",
              "Acompanhe as entregas",
              "Cada patrocínio fechado vira uma lista de entregas, com comprovação e aprovação num só lugar.",
            ],
          ].map(([n, t, d]) => (
            <div key={n} className="border-foreground border-t-2 pt-4">
              <span className="text-primary font-[family-name:var(--font-heading)] text-sm font-bold">
                {n}
              </span>
              <h3 className="mt-2 text-xl font-semibold">{t}</h3>
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
