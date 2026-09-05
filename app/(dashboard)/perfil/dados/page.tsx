import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DadosForm } from "./dados-form";
import type { AthleteDocument } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Dados pessoais — Sponsas" };

export default async function DadosPessoaisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil/dados");

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();
  if (profile?.type !== "athlete") redirect("/perfil");

  const { data: doc } = await supabase
    .from("athlete_documents")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/perfil"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Meu perfil
      </Link>
      <h1 className="mt-4 text-3xl">Dados pessoais</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Ficam privados — visíveis só pra você e a Sponsas. Usados para os
        contratos de patrocínio e os repasses. Não aparecem no seu perfil
        público.
      </p>

      <div className="mt-6">
        <DadosForm doc={(doc as AthleteDocument | null) ?? null} />
      </div>
    </div>
  );
}
