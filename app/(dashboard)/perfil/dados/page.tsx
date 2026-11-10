import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DadosForm } from "./dados-form";
import { LegalForm } from "./legal-form";
import type {
  AthleteDocument,
  PartyLegalInfo,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Dados para contrato — Sponsas" };

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
  if (!profile) redirect("/perfil");

  // Empresa, pista, evento e mídia: dados jurídicos (CNPJ/CPF + endereço).
  if (profile.type !== "athlete") {
    const { data: info } = await supabase
      .from("party_legal_info")
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
        <h1 className="mt-4 text-3xl">Dados para contrato</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vão na qualificação das partes do contrato de patrocínio — só você e
          a outra parte de cada contrato veem. Não aparecem no perfil público.
          Sem eles, não dá pra dar o &ldquo;de acordo&rdquo; num contrato.
        </p>
        <div className="mt-6">
          <LegalForm info={(info as PartyLegalInfo | null) ?? null} />
        </div>
      </div>
    );
  }

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
        Ficam privados — só você, a Sponsas e a outra parte de cada contrato
        (na qualificação das partes) veem. Usados para os
        contratos de patrocínio e os repasses. Não aparecem no seu perfil
        público.
      </p>

      <div className="mt-6">
        <DadosForm doc={(doc as AthleteDocument | null) ?? null} />
      </div>
    </div>
  );
}
