import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Para pilotos — Sponsas",
  description:
    "Monte um perfil comercial de verdade, defina sua tabela de preços e deixe seu Rank Sponsas puxar o valor dos seus patrocínios.",
};

const BENEFICIOS = [
  [
    "Um perfil que vende por você",
    "Resultados, redes com números reais, entregas que você oferece e uma tabela de preços clara. É o que a marca vê quando te encontra.",
  ],
  [
    "Rank Sponsas puxa seu valor",
    "Entregar no prazo, cumprir a demanda e crescer engajamento sobe seu rank. Rank melhor = marca topa pagar mais, em dinheiro ou permuta.",
  ],
  [
    "Dinheiro, permuta ou os dois",
    "Aceite pneus, peças, combustível — com valor estimado — ou um valor mensal, ou a combinação. Tudo registrado no acordo.",
  ],
  [
    "Suas entregas organizadas",
    "Cada patrocínio vira uma lista. Você anexa o link da comprovação, a marca aprova, e isso fica no seu histórico.",
  ],
];

export default function ParaPilotosPage() {
  return (
    <main>
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <h1 className="max-w-2xl text-5xl">
          Pare de pedir patrocínio por DM.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-lg">
          Monte seu perfil comercial uma vez. As marcas te encontram, mandam
          proposta e você fecha com entregas combinadas — não no boca a boca.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/cadastro">Criar perfil de piloto</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/como-funciona">Como funciona</Link>
          </Button>
        </div>
      </section>

      <section className="border-border border-t">
        <div className="mx-auto grid max-w-[1120px] gap-x-10 gap-y-8 px-6 py-16 md:grid-cols-2">
          {BENEFICIOS.map(([t, d]) => (
            <div key={t} className="border-primary border-l-3 pl-5">
              <p className="font-semibold">{t}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <h2 className="text-3xl">É grátis para começar</h2>
        <p className="text-muted-foreground mt-2 max-w-lg text-sm">
          Perfil, candidaturas e recebimento de propostas no plano Free. O PRO
          libera a tabela de preços sem limite e destaque no topo da busca.{" "}
          <Link href="/planos" className="text-foreground underline">
            Ver planos
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
