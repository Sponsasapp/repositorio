import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, PLAN_LABEL, startOfMonthISO } from "@/lib/plan";
import { formatBRL, formatDateBR } from "@/lib/format";
import { alternarPlanoTeste } from "./actions";
import { Button } from "@/components/ui/button";
import type { CouponCommission } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Configurações — Sponsas" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/configuracoes");

  const { data: profile } = await supabase
    .from("profiles")
    .select("type, plan")
    .eq("id", user.id)
    .single();

  const isCompany = profile?.type === "company";
  const isFree = profile?.plan !== "pro";
  const isDev = process.env.NODE_ENV !== "production";

  // Uso atual
  const [{ count: opps }, { count: props }, { data: pkgs }] = await Promise.all([
    isCompany
      ? supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("company_id", user.id)
          .eq("status", "open")
      : Promise.resolve({ count: 0 }),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("from_profile_id", user.id)
      .gte("created_at", startOfMonthISO()),
    !isCompany
      ? supabase
          .from("athlete_packages")
          .select("modality")
          .eq("athlete_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const { data: commRaw } = await supabase
    .from("coupon_commissions")
    .select("*")
    .order("created_at", { ascending: false });
  const comissoes = (commRaw ?? []) as CouponCommission[];
  const commPendente = comissoes
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.commission_amount), 0);
  const commPaga = comissoes
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.commission_amount), 0);

  // Limite da tabela de preços é por modalidade — mostra a mais cheia.
  const pkgByModality = new Map<string, number>();
  for (const row of (pkgs as { modality: string }[] | null) ?? []) {
    pkgByModality.set(row.modality, (pkgByModality.get(row.modality) ?? 0) + 1);
  }
  const pkgMax = Math.max(0, ...pkgByModality.values());

  const usos: { label: string; atual: number; limite: number }[] = [
    ...(isCompany
      ? [
          {
            label: "Oportunidades abertas",
            atual: opps ?? 0,
            limite: PLAN_LIMITS.openOpportunities,
          },
        ]
      : []),
    {
      label: "Propostas enviadas neste mês",
      atual: props ?? 0,
      limite: PLAN_LIMITS.proposalsPerMonth,
    },
    ...(!isCompany
      ? [
          {
            label: "Itens na tabela de preços (por modalidade)",
            atual: pkgMax,
            limite: PLAN_LIMITS.rateCardItems,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-4xl">Configurações</h1>

      <section className="border-primary bg-card mt-8 rounded-xl border border-l-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[13px]">Seu plano</p>
            <p className="font-[family-name:var(--font-heading)] text-3xl">
              {PLAN_LABEL[profile?.plan ?? "free"]}
            </p>
          </div>
          {isFree ? (
            <span className="text-muted-foreground text-sm">
              Grátis, para sempre
            </span>
          ) : (
            <span className="text-success text-sm">Sem limites</span>
          )}
        </div>

        {isFree && (
          <div className="mt-4 space-y-2">
            {usos.map((u) => (
              <div key={u.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{u.label}</span>
                <span
                  className={
                    u.atual >= u.limite ? "text-primary font-medium" : ""
                  }
                >
                  {u.atual} / {u.limite}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {isFree && (
        <section className="mt-6">
          <h2 className="text-xl">Sponsas PRO</h2>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Oportunidades e propostas sem limite</li>
            <li>Tabela de preços sem limite de itens</li>
            <li>Destaque no topo da busca de pilotos</li>
          </ul>
          <p className="text-muted-foreground mt-3 text-sm">
            No momento o upgrade é manual (PIX). Fale com a gente pelo e-mail{" "}
            <a
              href="mailto:sponsasapp@gmail.com"
              className="text-foreground underline"
            >
              sponsasapp@gmail.com
            </a>
            .
          </p>

          {isDev && (
            <form action={alternarPlanoTeste} className="mt-3">
              <Button type="submit" variant="outline" size="sm">
                Ativar PRO (teste — só em dev)
              </Button>
            </form>
          )}
        </section>
      )}

      {!isFree && isDev && (
        <form action={alternarPlanoTeste} className="mt-6">
          <Button type="submit" variant="outline" size="sm">
            Voltar para Free (teste — só em dev)
          </Button>
        </form>
      )}

      {comissoes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl">Comissões de influencer</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {commPct(comissoes)}% de cada assinatura PRO feita com seus
            cupons. O repasse é combinado direto com a Sponsas.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="border-border bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">A receber</p>
              <p className="font-[family-name:var(--font-heading)] text-2xl">
                {formatBRL(commPendente)}
              </p>
            </div>
            <div className="border-border bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-xs">Já pago</p>
              <p className="font-[family-name:var(--font-heading)] text-2xl">
                {formatBRL(commPaga)}
              </p>
            </div>
          </div>
          <ul className="border-border mt-4 flex flex-col divide-y rounded-lg border text-sm">
            {comissoes.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-muted-foreground">
                  {formatDateBR(c.created_at.slice(0, 10))} · {c.plan_months}{" "}
                  {c.plan_months === 1 ? "mês" : "meses"} de PRO
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatBRL(Number(c.commission_amount))}
                  </span>
                  <span
                    className={
                      c.status === "paid"
                        ? "bg-success-soft text-success rounded-full px-2 py-0.5 text-[11px]"
                        : "bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]"
                    }
                  >
                    {c.status === "paid" ? "pago" : "a receber"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function commPct(cs: CouponCommission[]): number {
  return cs[0] ? Number(cs[0].commission_pct) : 5;
}
