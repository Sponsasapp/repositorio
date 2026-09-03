import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plan";
import { MODALITIES, MODALITY_VALUES } from "@/lib/sports";
import type { AthleteModality } from "@/lib/types/database.types";
import { PerfilPilotoForm } from "./perfil-form";
import { PerfilEmpresaForm } from "./perfil-empresa-form";

export const metadata: Metadata = { title: "Meu perfil — Sponsas" };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl">Meu perfil</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Os dados da sua empresa e da campanha que você quer rodar.
            </p>
          </div>
          <Link
            href={`/e/${user.id}`}
            className="text-foreground shrink-0 text-sm underline underline-offset-2"
          >
            Ver perfil público
          </Link>
        </div>
        <PerfilEmpresaForm profile={profile} company={company ?? null} />
      </div>
    );
  }

  const [
    { data: modalitiesData },
    { data: cars },
    { data: achievements },
    { data: socials },
    { data: packages },
    { data: posts },
  ] = await Promise.all([
    supabase
      .from("athlete_modalities")
      .select("*")
      .eq("profile_id", user.id),
    supabase
      .from("athlete_cars")
      .select("*")
      .eq("athlete_id", user.id)
      .order("position"),
    supabase
      .from("athlete_achievements")
      .select("*")
      .eq("athlete_id", user.id)
      .order("position"),
    supabase.from("social_links").select("*").eq("profile_id", user.id),
    supabase
      .from("athlete_packages")
      .select("*")
      .eq("athlete_id", user.id)
      .order("position"),
    supabase
      .from("athlete_posts")
      .select("*")
      .eq("athlete_id", user.id)
      .order("likes", { ascending: false }),
  ]);

  const modalities = (modalitiesData ?? []) as AthleteModality[];
  const modOrder = new Map(MODALITY_VALUES.map((v, i) => [v, i]));
  modalities.sort(
    (a, b) => (modOrder.get(a.modality) ?? 99) - (modOrder.get(b.modality) ?? 99),
  );

  // Modalidade sendo editada: ?m=, senão a primeira do piloto, senão Arrancada.
  const activeValue =
    (sp.m && MODALITY_VALUES.includes(sp.m) ? sp.m : null) ??
    modalities[0]?.modality ??
    "Arrancada";
  const active = modalities.find((m) => m.modality === activeValue) ?? null;

  const missing = MODALITIES.filter(
    (m) => !modalities.some((x) => x.modality === m.value),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl">Meu perfil</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Dados básicos e redes sociais valem para todas as modalidades. O
            resto (categoria, carros, conquistas, preços) é por modalidade.
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
        key={activeValue}
        profile={profile}
        modalities={modalities.map((m) => m.modality)}
        activeModality={activeValue}
        active={active}
        missingModalities={missing}
        cars={(cars ?? []).filter((c) => c.modality === activeValue)}
        achievements={(achievements ?? []).filter(
          (a) => a.modality === activeValue,
        )}
        socials={socials ?? []}
        packages={(packages ?? []).filter((p) => p.modality === activeValue)}
        posts={posts ?? []}
        rateCardLimit={profile.plan === "pro" ? null : PLAN_LIMITS.rateCardItems}
      />
    </div>
  );
}
