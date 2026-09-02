import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, PLAN_LABEL, startOfMonthISO } from "@/lib/plan";
import { alternarPlanoTeste } from "./actions";
import { Button } from "@/components/ui/button";

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
  const [{ count: opps }, { count: props }, { count: pkgs }] = await Promise.all([
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
          .select("id", { count: "exact", head: true })
          .eq("athlete_id", user.id)
      : Promise.resolve({ count: 0 }),
  ]);

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
            label: "Itens na tabela de preços",
            atual: pkgs ?? 0,
            limite: PLAN_LIMITS.rateCardItems,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-2xl flex-1 px-6 py-10">
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
            <span className="text-foreground">contato@sponsas.com</span>.
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
    </main>
  );
}
