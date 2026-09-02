import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  OpportunityCard,
  type OpportunityCardData,
} from "@/components/opportunity-card";
import { Button } from "@/components/ui/button";

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
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/"
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          ← Sponsas
        </Link>

        <div className="mt-4 flex items-end justify-between gap-4">
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
            <p className="text-muted-foreground text-sm">
              Nenhuma oportunidade aberta no momento.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {open.map((o) => (
                <OpportunityCard key={o.id} opp={o} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
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
