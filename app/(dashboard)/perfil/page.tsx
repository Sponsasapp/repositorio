import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PerfilPilotoForm } from "./perfil-form";

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
  if (profile.type === "company") redirect("/dashboard"); // perfil de empresa = passo 5

  const [{ data: athlete }, { data: socials }] = await Promise.all([
    supabase
      .from("athlete_profiles")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("social_links").select("*").eq("profile_id", user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-4xl">Meu perfil</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        É o que as marcas veem quando encontram você. Redes sociais são
        preenchidas manualmente por enquanto.
      </p>
      <PerfilPilotoForm
        profile={profile}
        athlete={athlete ?? null}
        socials={socials ?? []}
      />
    </div>
  );
}
