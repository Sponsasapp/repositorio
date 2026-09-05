import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/marketing/eyebrow";

const DESCRIPTION =
  "Encontre pilotos por rank, engajamento e região. Feche patrocínios em dinheiro ou permuta e acompanhe cada entrega.";
export const metadata: Metadata = {
  title: "Para empresas — Sponsas",
  description: DESCRIPTION,
  alternates: { canonical: "/para-empresas" },
  openGraph: { title: "Para empresas — Sponsas", description: DESCRIPTION },
};

const BENEFICIOS = [
  [
    "Escolha com dados, não no feeling",
    "Cada piloto tem seguidores, alcance, engajamento e um Rank Sponsas que reflete se ele cumpre o combinado. Filtre por modalidade, estado e faixa de valor.",
  ],
  [
    "Permuta é first-class",
    "Nem todo patrocínio é dinheiro. Ofereça produto ou serviço com valor estimado — sozinho ou combinado com um valor mensal.",
  ],
  [
    "Oportunidades ou proposta direta",
    "Abra uma vaga e receba candidaturas, ou vá direto no piloto que você quer. Você decide o valor, a duração e as entregas.",
  ],
  [
    "Entregas com comprovação",
    "O acordo vira um checklist. O piloto anexa o link de cada entrega e você aprova. Sem planilha paralela, sem cobrança no WhatsApp.",
  ],
];

export default function ParaEmpresasPage() {
  return (
    <main>
      <section className="mx-auto max-w-[1120px] px-6 py-16">
        <Eyebrow>Para empresas</Eyebrow>
        <h1 className="mt-4 max-w-2xl text-5xl">
          Patrocine quem entrega — e prove que entregou.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-lg">
          A Sponsas te dá o perfil comercial completo do piloto, um rank de
          confiabilidade e o acompanhamento das entregas do começo ao fim.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/cadastro?tipo=empresa">Criar conta de empresa</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pilotos">Explorar pilotos</Link>
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
            Sem cartão — comece grátis e suba pro PRO quando precisar
          </p>
        </div>
        <h2 className="mt-6 text-3xl">Comece grátis</h2>
        <p className="text-muted-foreground mt-2 max-w-lg text-sm">
          O plano Free permite manter uma oportunidade aberta e enviar até 3
          propostas por mês. O PRO libera tudo e coloca você na frente.{" "}
          <Link href="/planos" className="text-foreground underline">
            Ver planos
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
