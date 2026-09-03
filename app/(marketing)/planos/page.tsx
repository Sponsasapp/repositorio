import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_LIMITS } from "@/lib/plan";
import { Button } from "@/components/ui/button";

const DESCRIPTION = "Free para começar. PRO quando precisar de mais.";
export const metadata: Metadata = {
  title: "Planos — Sponsas",
  description: DESCRIPTION,
  alternates: { canonical: "/planos" },
  openGraph: { title: "Planos — Sponsas", description: DESCRIPTION },
};

const LINHAS: [string, string, string][] = [
  ["Perfil público e busca", "Sim", "Sim"],
  ["Candidatar-se a oportunidades", "Sim", "Sim"],
  ["Receber propostas", "Sim", "Sim"],
  [
    "Oportunidades abertas (empresa)",
    `${PLAN_LIMITS.openOpportunities}`,
    "Ilimitado",
  ],
  [
    "Propostas enviadas por mês",
    `${PLAN_LIMITS.proposalsPerMonth}`,
    "Ilimitado",
  ],
  [
    "Itens na tabela de preços (piloto)",
    `${PLAN_LIMITS.rateCardItems}`,
    "Ilimitado",
  ],
  ["Destaque no topo da busca", "—", "Sim"],
];

export default function PlanosPage() {
  return (
    <main className="mx-auto max-w-[900px] px-6 py-16">
      <h1 className="text-5xl">Planos</h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-lg">
        Comece de graça. Suba para o PRO quando o volume pedir.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <div className="border-border rounded-xl border p-6">
          <p className="font-[family-name:var(--font-heading)] text-2xl">Free</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Grátis, para sempre
          </p>
          <Button asChild size="lg" variant="outline" className="mt-4 w-full">
            <Link href="/cadastro">Criar conta</Link>
          </Button>
        </div>
        <div className="border-primary bg-card rounded-xl border border-l-3 p-6">
          <p className="font-[family-name:var(--font-heading)] text-2xl">PRO</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Upgrade manual por PIX — fale com a gente
          </p>
          <Button asChild size="lg" className="mt-4 w-full">
            <Link href="/cadastro">Começar no Free</Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-left">
              <th className="py-3 font-medium">Recurso</th>
              <th className="py-3 font-medium">Free</th>
              <th className="py-3 font-medium">PRO</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map(([rec, free, pro]) => (
              <tr key={rec} className="border-border border-b">
                <td className="py-3">{rec}</td>
                <td className="py-3">{free}</td>
                <td className="py-3 font-medium">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted-foreground mt-8 text-sm">
        Pagamento automatizado entra numa próxima fase. Por enquanto o upgrade
        para PRO é combinado direto com a Sponsas.
      </p>
    </main>
  );
}
