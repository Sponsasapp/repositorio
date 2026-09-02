import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpportunityForm } from "./opportunity-form";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "Nova oportunidade — Sponsas" };

export default async function NovaOportunidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/oportunidades/nova");

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();
  if (profile?.type !== "company") redirect("/oportunidades");

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/oportunidades"
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          ← Oportunidades
        </Link>
        <h1 className="mt-4 text-4xl">Nova oportunidade</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pilotos vão poder se candidatar. Você aceita ou recusa cada
          candidatura.
        </p>
        <OpportunityForm />
      </div>
    </AppShell>
  );
}
