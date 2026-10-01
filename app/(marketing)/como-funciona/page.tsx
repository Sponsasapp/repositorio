import type { Metadata } from "next";
import Link from "next/link";
import {
  UserRoundPlusIcon,
  SearchIcon,
  MessageSquareIcon,
  PackageCheckIcon,
  MegaphoneIcon,
  HandshakeIcon,
  ClipboardCheckIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/marketing/eyebrow";

const DESCRIPTION =
  "Do perfil comercial ao patrocínio fechado, com entregas acompanhadas.";
export const metadata: Metadata = {
  title: "Como funciona — Sponsas",
  description: DESCRIPTION,
  alternates: { canonical: "/como-funciona" },
  openGraph: { title: "Como funciona — Sponsas", description: DESCRIPTION },
};

type Passo = { icon: LucideIcon; t: string; d: string };

const PASSOS_PILOTO: Passo[] = [
  {
    icon: UserRoundPlusIcon,
    t: "Monte seu perfil comercial",
    d: "Categoria, equipe, resultados e redes sociais (com seguidores, alcance e interações). Monte uma tabela de preços com o que uma marca pode contratar — de adesivo no carro a pacote de stories + reels.",
  },
  {
    icon: SearchIcon,
    t: "Apareça para as marcas",
    d: "Seu perfil é público e aparece na busca com filtros de modalidade, categoria, estado, orçamento e Rank Sponsas. Você também se candidata a oportunidades abertas por empresas.",
  },
  {
    icon: MessageSquareIcon,
    t: "Receba e responda propostas",
    d: "Propostas chegam com valor, duração, entregas e observações. Podem ser em dinheiro, permuta (produto/serviço com valor estimado) ou os dois. Você aceita ou recusa.",
  },
  {
    icon: PackageCheckIcon,
    t: "Cumpra as entregas",
    d: "Ao aceitar, nasce o patrocínio com uma lista de entregas. Você anexa o link da comprovação (post, story, vídeo) e a marca aprova. Entregar no prazo sobe seu Rank Sponsas.",
  },
];

const FAQ: [string, string][] = [
  [
    "Quanto custa usar a Sponsas?",
    "O plano Free é grátis pra sempre: perfil público, candidaturas e propostas. O PRO (R$ 39,90/mês) libera sem limites e dá destaque no topo da busca.",
  ],
  [
    "Como funciona o pagamento do patrocínio?",
    "Valor, permuta e duração são combinados direto entre a marca e o patrocinado dentro da proposta. A Sponsas organiza o acordo e as entregas — o pagamento em si hoje é combinado fora da plataforma.",
  ],
  [
    "Preciso ter muitos seguidores pra participar?",
    "Não. O Rank Sponsas considera entregar no prazo e cumprir o combinado, não só alcance. Perfis pequenos com boa entrega sobem de rank normalmente.",
  ],
  [
    "Meus dados pessoais (CPF, endereço) ficam seguros?",
    "Sim. Dados como CPF, RG e endereço ficam numa tabela isolada, visível só pra você — nunca aparecem no perfil público nem pra outros usuários.",
  ],
  [
    "Empresas só podem patrocinar pilotos?",
    "Não. Além de pilotos, dá pra patrocinar pistas, eventos e perfis de mídia (fotógrafos, filmmakers, influenciadores do esporte).",
  ],
  [
    "Posso cancelar quando quiser?",
    "Sim, sem fidelidade. O plano PRO pode ser cancelado a qualquer momento e seu perfil continua ativo no Free.",
  ],
];

const PASSOS_EMPRESA: Passo[] = [
  {
    icon: SearchIcon,
    t: "Encontre pilotos",
    d: "Busque por modalidade, região, faixa de valor, engajamento e Rank Sponsas. O rank é um termômetro de quem cumpre o combinado.",
  },
  {
    icon: MegaphoneIcon,
    t: "Abra uma oportunidade ou proponha direto",
    d: "Publique uma vaga de patrocínio e receba candidaturas, ou envie uma proposta direta para um piloto específico.",
  },
  {
    icon: HandshakeIcon,
    t: "Feche o acordo",
    d: "Defina valor, permuta, duração e entregas esperadas. Quando o piloto aceita, o patrocínio é criado automaticamente com esses termos.",
  },
  {
    icon: ClipboardCheckIcon,
    t: "Acompanhe e aprove",
    d: "Cada entrega chega com a comprovação anexada. Você aprova ou pede ajuste. Tudo fica registrado.",
  },
];

function Fluxo({
  titulo,
  passos,
  tint,
}: {
  titulo: string;
  passos: Passo[];
  tint: "teal" | "primary";
}) {
  return (
    <div
      className={`gradient-border relative rounded-2xl border p-6 ${tint === "teal" ? "panel-teal" : "panel-primary"}`}
    >
      <h2 className="text-2xl">{titulo}</h2>
      <ol className="mt-6 flex flex-col gap-5">
        {passos.map(({ icon: Icon, t, d }, i) => (
          <li
            key={t}
            className="border-border bg-card flex gap-4 rounded-xl border p-5"
          >
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span
                className={`flex size-10 items-center justify-center rounded-full ${tint === "teal" ? "bg-success-soft text-success" : "bg-primary/15 text-primary"}`}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="text-muted-foreground text-[11px] font-semibold">
                {i + 1}
              </span>
            </div>
            <div>
              <p className="font-semibold">{t}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {d}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ComoFuncionaPage() {
  return (
    <main className="mx-auto max-w-[1120px] px-6 py-16">
      <div className="reveal reveal-1">
        <Eyebrow>Simples assim</Eyebrow>
        <h1 className="mt-4 max-w-2xl text-5xl">
          Da conversa informal ao{" "}
          <span className="text-gradient">patrocínio acompanhado.</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-lg">
          A Sponsas organiza os dois lados: o piloto monta um perfil comercial
          de verdade, a marca encontra quem combina e acompanha cada entrega.
        </p>
      </div>

      <div className="mt-14 grid gap-8 md:grid-cols-2">
        <div className="reveal reveal-2">
          <Fluxo titulo="Para pilotos" passos={PASSOS_PILOTO} tint="teal" />
        </div>
        <div className="reveal reveal-3">
          <Fluxo titulo="Para empresas" passos={PASSOS_EMPRESA} tint="primary" />
        </div>
      </div>

      <div className="reveal reveal-4 mt-16 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/cadastro">Criar conta</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pilotos">Ver pilotos</Link>
        </Button>
      </div>

      <section className="reveal mt-20 max-w-2xl">
        <h2 className="text-2xl">Perguntas frequentes</h2>
        <div className="border-border mt-6 divide-y rounded-xl border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-primary shrink-0 text-xl leading-none transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
