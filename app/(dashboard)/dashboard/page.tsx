import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Painel — Sponsas" };

const TIPO_LABEL: Record<string, string> = {
  athlete: "Piloto",
  company: "Empresa",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, type")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl">
        Olá, {profile?.name || user.email?.split("@")[0]}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Conta do tipo{" "}
        <span className="text-foreground font-medium">
          {profile ? (TIPO_LABEL[profile.type] ?? profile.type) : "—"}
        </span>
        . O painel completo chega nos próximos passos.
      </p>

      <div className="border-primary bg-card mt-8 rounded-lg border border-l-3 p-5">
        <p className="text-sm font-semibold">Comece pelo seu perfil</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Preencha seus dados esportivos, redes sociais e o que você oferece a um
          patrocinador. É o que as marcas veem.
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/perfil">Editar meu perfil</Link>
        </Button>
      </div>
    </div>
  );
}
