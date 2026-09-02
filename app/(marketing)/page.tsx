import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PilotCard, type PilotCardData } from "@/components/pilot-card";
import { Button } from "@/components/ui/button";
import type { RankTier } from "@/lib/types/database.types";

export default async function HomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, name, photo_url, city, state, plan, athlete_profiles!inner(modality, category, rank_tier), athlete_cars(photo_url, position), social_links(followers, avg_interactions)",
    )
    .eq("type", "athlete")
    .limit(6);

  type Joined = {
    id: string;
    name: string;
    photo_url: string | null;
    city: string | null;
    state: string | null;
    plan: "free" | "pro";
    athlete_profiles: {
      modality: string | null;
      category: string | null;
      rank_tier: RankTier | null;
    } | null;
    athlete_cars: { photo_url: string | null; position: number }[];
    social_links: { followers: number | null; avg_interactions: number | null }[];
  };

  const destaques: PilotCardData[] = ((data ?? []) as unknown as Joined[])
    .map((p) => {
      const followers = p.social_links.reduce(
        (s, l) => s + (l.followers ?? 0),
        0,
      );
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
            .sort((a, b) => a.position - b.position)
            .find((c) => c.photo_url)?.photo_url ?? null,
        city: p.city,
        state: p.state,
        modality: p.athlete_profiles?.modality ?? null,
        category: p.athlete_profiles?.category ?? null,
        tier: p.athlete_profiles?.rank_tier ?? null,
        isPro: p.plan === "pro",
        followers,
        engagement:
          followers > 0 && interactions > 0
            ? Math.min((interactions / followers) * 100, 100)
            : null,
      };
    })
    .slice(0, 3);

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
                <Link href="/cadastro">Criar perfil de piloto</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/para-empresas">Sou uma empresa</Link>
              </Button>
            </div>
          </div>

          <div className="bg-navy text-navy-foreground rounded-xl p-7">
            <span className="bg-primary/15 text-primary inline-block rounded-md px-2.5 py-1 text-xs font-semibold">
              Exemplo de patrocínio ativo
            </span>
            <h3 className="mt-4 text-2xl">Óleo Rubra × Larissa Farah</h3>
            <p className="text-sm text-white/60">Arrancada · Categoria Pro · 6 meses</p>
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
        </div>
      </section>

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
