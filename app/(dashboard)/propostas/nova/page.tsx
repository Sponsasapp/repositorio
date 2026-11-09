import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropostaForm } from "./proposta-form";
import { canPropose, publicPath } from "@/lib/participant-types";

export const metadata: Metadata = { title: "Nova proposta — Sponsas" };

export default async function NovaPropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ para?: string; oportunidade?: string }>;
}) {
  const { para, oportunidade } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/propostas/nova?para=${para ?? ""}`);

  if (!para) redirect("/pilotos");

  const { data: mine } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", user.id)
    .single();
  const { data: dest } = await supabase
    .from("profiles")
    .select("name, type")
    .eq("id", para)
    .maybeSingle();

  const problema =
    !dest
      ? "Perfil não encontrado."
      : para === user.id
        ? "Você não pode enviar uma proposta para si mesmo."
        : !mine || !canPropose(mine.type, dest.type)
          ? "Propostas são entre uma empresa e um patrocinado (piloto, pista, evento ou mídia)."
          : null;

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-2xl">
        <Link
          href={dest ? publicPath(dest.type, para) : "/pilotos"}
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          ← Voltar
        </Link>
        <h1 className="mt-4 text-4xl">Nova proposta</h1>

        {problema ? (
          <p className="text-muted-foreground mt-4 text-sm">{problema}</p>
        ) : (
          <PropostaForm
            para={para}
            paraNome={dest!.name}
            oportunidade={oportunidade}
          />
        )}
      </div>
    </div>
  );
}
