import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/marketing/eyebrow";

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

function Cell({ value }: { value: string }) {
  if (value === "Sim") {
    return <CheckIcon className="text-success size-4" strokeWidth={3} />;
  }
  if (value === "—") {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return <>{value}</>;
}

export default function PlanosPage() {
  return (
    <main className="mx-auto max-w-[900px] px-6 py-16">
      <Eyebrow>Planos</Eyebrow>
      <h1 className="mt-4 text-5xl">Planos</h1>
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
        <div className="bg-navy text-navy-foreground relative overflow-hidden rounded-xl p-6">
          <div className="bg-primary/25 pointer-events-none absolute -top-16 -right-10 size-40 rounded-full blur-3xl" />
          <span className="bg-primary/15 text-primary relative inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
            Mais escolhido
          </span>
          <p className="relative mt-2 font-[family-name:var(--font-heading)] text-2xl">
            PRO
          </p>
          <p className="relative mt-1 text-sm text-white/60">
            Upgrade manual por PIX — fale com a gente
          </p>
          <Button asChild size="lg" className="relative mt-4 w-full">
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
                <td className="py-3">
                  <Cell value={free} />
                </td>
                <td className="py-3 font-medium">
                  <Cell value={pro} />
                </td>
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
