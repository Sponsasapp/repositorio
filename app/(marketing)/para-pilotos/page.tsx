import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/marketing/eyebrow";

const DESCRIPTION =
  "Monte um perfil comercial de verdade, defina sua tabela de preços e deixe seu Rank Sponsas puxar o valor dos seus patrocínios.";
export const metadata: Metadata = {
  title: "Para pilotos — Sponsas",
  description: DESCRIPTION,
  alternates: { canonical: "/para-pilotos" },
  openGraph: { title: "Para pilotos — Sponsas", description: DESCRIPTION },
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
        <Eyebrow>Para pilotos</Eyebrow>
        <h1 className="mt-4 max-w-2xl text-5xl">
          Pare de pedir patrocínio por DM.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-lg">
          Monte seu perfil comercial uma vez. As marcas te encontram, mandam
          proposta e você fecha com entregas combinadas — não no boca a boca.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/cadastro?tipo=piloto">Criar perfil de piloto</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/como-funciona">Como funciona</Link>
          </Button>
        </div>
      </section>

      <section className="border-border border-t">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <ul className="grid gap-x-10 gap-y-7 md:grid-cols-2">
            {BENEFICIOS.map(([t, d]) => (
              <li key={t} className="flex items-start gap-3">
                <span className="bg-primary/15 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                  <CheckIcon className="size-3.5" strokeWidth={3} />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {d}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="border-primary/25 bg-primary/5 max-w-xl rounded-lg border px-5 py-4">
          <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
            Perfil, candidaturas e propostas — de graça, pra sempre
          </p>
        </div>
        <h2 className="mt-6 text-3xl">É grátis para começar</h2>
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
