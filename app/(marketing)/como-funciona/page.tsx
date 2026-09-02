import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Como funciona — Sponsas",
  description:
    "Do perfil comercial ao patrocínio fechado, com entregas acompanhadas.",
};

const PASSOS_PILOTO = [
  [
    "Monte seu perfil comercial",
    "Categoria, equipe, resultados e redes sociais (com seguidores, alcance e interações). Monte uma tabela de preços com o que uma marca pode contratar — de adesivo no carro a pacote de stories + reels.",
  ],
  [
    "Apareça para as marcas",
    "Seu perfil é público e aparece na busca com filtros de modalidade, categoria, estado, orçamento e Rank Sponsas. Você também se candidata a oportunidades abertas por empresas.",
  ],
  [
    "Receba e responda propostas",
    "Propostas chegam com valor, duração, entregas e observações. Podem ser em dinheiro, permuta (produto/serviço com valor estimado) ou os dois. Você aceita ou recusa.",
  ],
  [
    "Cumpra as entregas",
    "Ao aceitar, nasce o patrocínio com uma lista de entregas. Você anexa o link da comprovação (post, story, vídeo) e a marca aprova. Entregar no prazo sobe seu Rank Sponsas.",
  ],
];

const PASSOS_EMPRESA = [
  [
    "Encontre pilotos",
    "Busque por modalidade, região, faixa de valor, engajamento e Rank Sponsas. O rank é um termômetro de quem cumpre o combinado.",
  ],
  [
    "Abra uma oportunidade ou proponha direto",
    "Publique uma vaga de patrocínio e receba candidaturas, ou envie uma proposta direta para um piloto específico.",
  ],
  [
    "Feche o acordo",
    "Defina valor, permuta, duração e entregas esperadas. Quando o piloto aceita, o patrocínio é criado automaticamente com esses termos.",
  ],
  [
    "Acompanhe e aprove",
    "Cada entrega chega com a comprovação anexada. Você aprova ou pede ajuste. Tudo fica registrado.",
  ],
];

function Fluxo({ titulo, passos }: { titulo: string; passos: string[][] }) {
  return (
    <div>
      <h2 className="text-2xl">{titulo}</h2>
      <ol className="mt-6 flex flex-col gap-6">
        {passos.map(([t, d], i) => (
          <li key={t} className="border-foreground border-l-2 pl-5">
            <span className="text-primary font-[family-name:var(--font-heading)] text-sm font-bold">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-1 font-semibold">{t}</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {d}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-6 py-16">
      <h1 className="max-w-2xl text-5xl">
        Da conversa informal ao patrocínio acompanhado.
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-lg">
        A Sponsas organiza os dois lados: o piloto monta um perfil comercial de
        verdade, a marca encontra quem combina e acompanha cada entrega.
      </p>

      <div className="mt-14 grid gap-12 md:grid-cols-2">
        <Fluxo titulo="Para pilotos" passos={PASSOS_PILOTO} />
        <Fluxo titulo="Para empresas" passos={PASSOS_EMPRESA} />
      </div>

      <div className="mt-16 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/cadastro">Criar conta</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pilotos">Ver pilotos</Link>
        </Button>
      </div>
    </main>
  );
}
