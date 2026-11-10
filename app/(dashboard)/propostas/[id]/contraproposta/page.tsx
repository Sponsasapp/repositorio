import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropostaForm } from "../../nova/proposta-form";
import type { Proposal } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Contraproposta — Sponsas" };

export default async function ContrapropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/propostas/${id}/contraproposta`);

  const { data } = await supabase
    .from("proposals")
    .select("*, from:profiles!proposals_from_profile_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Proposal & { from: { name: string | null } | null };

  // Só quem recebeu, e só enquanto está pendente.
  if (p.to_profile_id !== user.id || p.status !== "pending") {
    redirect(`/propostas/${id}`);
  }

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/propostas/${id}`}
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          ← Voltar pra proposta
        </Link>
        <h1 className="mt-4 text-4xl">Contraproposta</h1>
        <PropostaForm
          para={p.from_profile_id}
          paraNome={p.from?.name ?? "a outra parte"}
          counterOf={p.id}
          initial={{
            payment_type: p.payment_type,
            value: p.value,
            trade_description: p.trade_description,
            trade_value: p.trade_value,
            duration_months: p.duration_months,
            deliverables: p.deliverables,
          }}
        />
      </div>
    </div>
  );
}
