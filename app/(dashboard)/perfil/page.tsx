import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PerfilPilotoForm } from "./perfil-form";
import { PerfilEmpresaForm } from "./perfil-empresa-form";

export const metadata: Metadata = { title: "Meu perfil — Sponsas" };

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.type === "company") {
    const { data: company } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();

    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl">Meu perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Os dados da sua empresa e da campanha que você quer rodar.
        </p>
        <PerfilEmpresaForm profile={profile} company={company ?? null} />
      </div>
    );
  }

  const [{ data: athlete }, { data: socials }, { data: packages }] =
    await Promise.all([
      supabase
        .from("athlete_profiles")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase.from("social_links").select("*").eq("profile_id", user.id),
      supabase
        .from("athlete_packages")
        .select("*")
        .eq("athlete_id", user.id)
        .order("position"),
    ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl">Meu perfil</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            É o que as marcas veem quando encontram você. Redes sociais são
            preenchidas manualmente por enquanto.
          </p>
        </div>
        <Link
          href={`/p/${user.id}`}
          className="text-foreground shrink-0 text-sm underline underline-offset-2"
        >
          Ver perfil público
        </Link>
      </div>
      <PerfilPilotoForm
        profile={profile}
        athlete={athlete ?? null}
        socials={socials ?? []}
        packages={packages ?? []}
      />
    </div>
  );
}
