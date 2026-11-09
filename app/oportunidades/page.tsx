import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  OpportunityCard,
  type OpportunityCardData,
} from "@/components/opportunity-card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Oportunidades — Sponsas",
  description: "Vagas de patrocínio abertas por marcas.",
};

type OppRow = Omit<OpportunityCardData, "companyName"> & {
  company_id: string;
  company: { name: string | null } | null;
};

export default async function OportunidadesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myType: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("type")
      .eq("id", user.id)
      .single();
    myType = profile?.type ?? null;
  }

  const { data: openData } = await supabase
    .from("opportunities")
    .select(
      "id, title, budget, duration_months, region, expected_deliverables, status, created_at, company_id, company:profiles(name)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const open = ((openData ?? []) as unknown as OppRow[]).map(toCard);

  let mine: OpportunityCardData[] = [];
  if (user && myType === "company") {
    const { data: mineData } = await supabase
      .from("opportunities")
      .select(
        "id, title, budget, duration_months, region, expected_deliverables, status, created_at, company_id, company:profiles(name)",
      )
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });
    mine = ((mineData ?? []) as unknown as OppRow[]).map(toCard);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl">Oportunidades</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Vagas de patrocínio abertas por marcas.
            </p>
          </div>
          {myType === "company" && (
            <Button asChild size="lg">
              <Link href="/oportunidades/nova">Criar oportunidade</Link>
            </Button>
          )}
        </div>

        {myType === "company" && mine.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl">Suas oportunidades</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {mine.map((o) => (
                <OpportunityCard key={o.id} opp={o} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          {myType === "company" && mine.length > 0 && (
            <h2 className="mb-3 text-xl">Todas as vagas abertas</h2>
          )}
          {open.length === 0 ? (
            myType === "company" ? (
              <EmptyState
                title="Nenhuma vaga aberta ainda"
                text="Abra a primeira: pilotos, pistas, eventos e mídias se candidatam e você escolhe com quem fechar."
                actions={[
                  { label: "Criar oportunidade", href: "/oportunidades/nova" },
                  { label: "Encontrar pilotos", href: "/pilotos" },
                ]}
              />
            ) : myType ? (
              <EmptyState
                title="As marcas estão chegando"
                text="Ainda não há vagas abertas. Enquanto isso, deixe seu perfil completo — é ele que a marca vê quando te encontra na busca — e procure as empresas direto."
                actions={[
                  { label: "Completar meu perfil", href: "/dashboard" },
                  { label: "Encontrar patrocinadores", href: "/empresas" },
                ]}
              />
            ) : (
              <EmptyState
                title="Nenhuma vaga aberta no momento"
                text="Crie sua conta pra montar seu perfil e ser encontrado pelas marcas — ou abra uma vaga se você é empresa."
                actions={[
                  { label: "Quero patrocínio", href: "/cadastro?tipo=piloto" },
                  { label: "Sou empresa", href: "/cadastro?tipo=empresa" },
                ]}
              />
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {open.map((o) => (
                <OpportunityCard key={o.id} opp={o} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function toCard(o: OppRow): OpportunityCardData {
  return {
    id: o.id,
    title: o.title,
    budget: o.budget,
    duration_months: o.duration_months,
    region: o.region,
    expected_deliverables: o.expected_deliverables,
    status: o.status,
    created_at: o.created_at,
    companyName: o.company?.name ?? null,
  };
}
