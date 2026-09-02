import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentSummary } from "@/lib/format";
import { SPONSORSHIP_STATUS } from "@/lib/sponsorship";
import type { Sponsorship } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Patrocínios — Sponsas" };

type Row = Sponsorship & {
  athlete: { name: string | null } | null;
  company: { name: string | null } | null;
};

export default async function PatrociniosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/patrocinios");

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();
  const iAmCompany = profile?.type === "company";

  const { data } = await supabase
    .from("sponsorships")
    .select(
      "*, athlete:profiles!sponsorships_athlete_id_fkey(name), company:profiles!sponsorships_company_id_fkey(name)",
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-4xl">Patrocínios</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Acordos fechados a partir de propostas aceitas.
        </p>

        {rows.length === 0 ? (
          <p className="text-muted-foreground mt-8 text-sm">
            Nenhum patrocínio ainda. Aceite uma proposta para começar.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {rows.map((s) => {
              const st = SPONSORSHIP_STATUS[s.status];
              const other = iAmCompany ? s.athlete?.name : s.company?.name;
              return (
                <Link
                  key={s.id}
                  href={`/patrocinios/${s.id}`}
                  className="border-border border-l-primary bg-card hover:border-l-primary/60 flex items-center justify-between gap-4 rounded-lg border border-l-3 p-4 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{other ?? "—"}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {paymentSummary(s)}
                      {s.duration_months ? ` · ${s.duration_months} meses` : ""}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Início {new Date(s.start_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${st?.cls}`}
                  >
                    {st?.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
