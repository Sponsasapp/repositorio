import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import {
  formatBRL,
  formatCompact,
  formatDateBR,
  formatNumber,
  formatRange,
  initials,
} from "@/lib/format";
import { tierInfo } from "@/lib/rank";
import { SITE_URL } from "@/lib/site";
import {
  MODALITY_VALUES,
  modalityLabel,
  pickPrimaryModality,
} from "@/lib/sports";
import { cn } from "@/lib/utils";
import type { AthleteModality } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
};

async function getPiloto(id: string, modalityParam?: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile || profile.type !== "athlete") return null;

  const [
    { data: modalitiesData },
    { data: cars },
    { data: achievements },
    { data: socials },
    { data: packages },
    { data: auth },
  ] = await Promise.all([
    supabase.from("athlete_modalities").select("*").eq("profile_id", id),
    supabase
      .from("athlete_cars")
      .select("*")
      .eq("athlete_id", id)
      .order("position"),
    supabase
      .from("athlete_achievements")
      .select("*")
      .eq("athlete_id", id)
      .order("position"),
    supabase
      .from("social_links")
      .select("*")
      .eq("profile_id", id)
      .order("followers", { ascending: false, nullsFirst: false }),
    supabase
      .from("athlete_packages")
      .select("*")
      .eq("athlete_id", id)
      .order("position"),
    supabase.auth.getUser(),
  ]);

  const modalities = (modalitiesData ?? []) as AthleteModality[];
  if (modalities.length === 0) return null;

  const modOrder = new Map(MODALITY_VALUES.map((v, i) => [v, i]));
  modalities.sort(
    (a, b) => (modOrder.get(a.modality) ?? 99) - (modOrder.get(b.modality) ?? 99),
  );

  const active =
    (modalityParam &&
      modalities.find((m) => m.modality === modalityParam)) ||
    pickPrimaryModality(modalities) ||
    modalities[0];
  const mv = active.modality;

  const modCars = (cars ?? []).filter((c) => c.modality === mv);
  const modAch = (achievements ?? []).filter((a) => a.modality === mv);
  const modPackages = (packages ?? []).filter((p) => p.modality === mv);

  const achievementsSorted = modAch.slice().sort((a, b) => {
    const ya = Number(a.year) || 0;
    const yb = Number(b.year) || 0;
    if (ya !== yb) return yb - ya;
    return a.position - b.position;
  });

  const viewerId = auth.user?.id ?? null;

  // Valores (preços dos pacotes, faixa desejada) são informação pessoal do
  // piloto: só o dono e empresas veem. Outros pilotos/visitantes, não.
  let viewerType: string | null = null;
  if (viewerId) {
    const { data: viewer } = await supabase
      .from("profiles")
      .select("type")
      .eq("id", viewerId)
      .maybeSingle();
    viewerType = viewer?.type ?? null;
  }
  const canSeeValues = viewerId === id || viewerType === "company";

  const safePackages = canSeeValues
    ? modPackages
    : modPackages.map((p) => ({ ...p, price: null }));
  const safeAthlete = canSeeValues
    ? active
    : { ...active, desired_value_min: null, desired_value_max: null };

  return {
    profile,
    athlete: safeAthlete,
    modalities: modalities.map((m) => m.modality),
    activeModality: mv,
    cars: modCars,
    achievements: achievementsSorted,
    socials: socials ?? [],
    packages: safePackages,
    viewerId,
    canSeeValues,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getPiloto(id);
  if (!data) return { title: "Perfil não encontrado — Sponsas" };
  const url = `${SITE_URL}/p/${id}`;
  const description =
    data.profile.bio ??
    `Perfil de ${data.profile.name} na Sponsas — pronto para receber patrocínio no automobilismo.`;
  return {
    title: `${data.profile.name} — Sponsas`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      title: `${data.profile.name} — Sponsas`,
      description,
    },
  };
}

export default async function PerfilPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modalidade?: string }>;
}) {
  const { id } = await params;
  const { modalidade } = await searchParams;
  const data = await getPiloto(id, modalidade);
  if (!data) notFound();

  const {
    profile,
    athlete,
    modalities,
    activeModality,
    cars,
    achievements,
    socials,
    packages,
    viewerId,
    canSeeValues,
  } = data;
  const isOwner = viewerId === profile.id;

  const carPhoto = cars.find((c) => c.photo_url)?.photo_url ?? null;
  const carAchievements = (carId: string) =>
    achievements.filter((a) => a.car_id === carId);

  const listState =
    athlete?.list_member && athlete.list_name
      ? ({ name: athlete.list_name, kind: "member" } as const)
      : athlete?.list_shark_tank && athlete.list_name
        ? ({ name: athlete.list_name, kind: "shark" } as const)
        : null;

  const followers = socials.reduce((s, l) => s + (l.followers ?? 0), 0);
  const reach = socials.reduce((s, l) => s + (l.avg_reach ?? 0), 0);
  const interactions = socials.reduce(
    (s, l) => s + (l.avg_interactions ?? 0),
    0,
  );
  const engagement =
    followers > 0 && interactions > 0
      ? Math.min((interactions / followers) * 100, 100)
      : null;

  const local = [profile.city, profile.state].filter(Boolean).join(", ");
  const linha = [athlete?.modality, athlete?.category, local]
    .filter(Boolean)
    .join(" · ");
  const faixa = formatRange(
    athlete?.desired_value_min,
    athlete?.desired_value_max,
  );

  return (
    <main className="flex-1">
      {/* Hero */}
      <div className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-5xl px-6 pt-14 pb-20">
          <Link href="/" className="text-sm text-white/50 hover:text-white">
            ← Sponsas
          </Link>
          <div className="mt-8 flex items-end gap-5">
            <div className="bg-primary flex size-24 items-center justify-center rounded-xl text-4xl">
              {profile.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photo_url}
                  alt={profile.name}
                  className="size-full rounded-xl object-cover"
                />
              ) : (
                <span className="font-[family-name:var(--font-heading)]">
                  {initials(profile.name)}
                </span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl">{profile.name}</h1>
                {tierInfo(athlete?.rank_tier) && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                    Rank Sponsas: {tierInfo(athlete?.rank_tier)!.label}
                  </span>
                )}
              </div>
              {linha && (
                <p className="mt-1 text-sm text-white/70">{linha}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="mx-auto -mt-12 max-w-5xl px-6 pb-20">
        {modalities.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {modalities.map((mv) => (
              <Link
                key={mv}
                href={mv === modalities[0] ? `/p/${id}` : `/p/${id}?modalidade=${encodeURIComponent(mv)}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  mv === activeModality
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {modalityLabel(mv)}
              </Link>
            ))}
          </div>
        )}
        {carPhoto && (
          <div className="border-border bg-card mb-6 overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={carPhoto}
              alt={cars[0]?.name ?? "Carro do piloto"}
              className="max-h-[380px] w-full object-cover"
            />
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-5">
            <Panel title="Métricas">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Seguidores" value={formatCompact(followers || null)} />
                <Stat label="Alcance somado" value={formatCompact(reach || null)} />
                <Stat
                  label="Engajamento"
                  value={engagement != null ? `${engagement.toFixed(1)}%` : "—"}
                />
              </div>
            </Panel>

            {profile.bio && (
              <Panel title="Sobre">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </Panel>
            )}

            {cars.length > 0 && (
              <Panel title={cars.length > 1 ? "Carros" : "Carro"}>
                <ul className="flex flex-col divide-y">
                  {cars.map((c) => {
                    const conq = carAchievements(c.id);
                    return (
                      <li key={c.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex gap-3">
                          {c.photo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.photo_url}
                              alt={c.name}
                              className="size-16 shrink-0 rounded-md object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{c.name}</p>
                            {c.team && (
                              <p className="text-muted-foreground text-xs">
                                {c.team}
                              </p>
                            )}
                            {c.championships && (
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                {c.championships}
                              </p>
                            )}
                          </div>
                        </div>
                        {conq.length > 0 && (
                          <ul className="border-border mt-3 flex flex-col gap-1.5 border-l pl-3 text-sm">
                            {conq.map((a) => (
                              <li key={a.id} className="flex gap-2">
                                {a.year && (
                                  <span className="text-muted-foreground shrink-0">
                                    {a.year}
                                  </span>
                                )}
                                <span>
                                  {a.title}
                                  {a.detail && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      — {a.detail}
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            )}

            {(achievements.length > 0 || athlete?.results) && (
              <Panel title="Conquistas">
                {achievements.length > 0 ? (
                  <ul className="flex flex-col divide-y">
                    {achievements.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        {a.year && (
                          <span className="text-muted-foreground font-[family-name:var(--font-heading)] shrink-0 text-sm">
                            {a.year}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{a.title}</p>
                          {a.detail && (
                            <p className="text-muted-foreground text-xs">
                              {a.detail}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {athlete?.results}
                  </p>
                )}
              </Panel>
            )}

            {athlete?.offered_deliverables &&
              athlete.offered_deliverables.length > 0 && (
                <Panel title="Entregas que oferece">
                  <Pills items={athlete.offered_deliverables.map(deliverableLabel)} />
                </Panel>
              )}

            {socials.length > 0 && (
              <Panel title="Redes sociais">
                <ul className="flex flex-col gap-3 text-sm">
                  {socials.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-medium">
                        {l.url ? (
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            {PLATFORM_LABEL[l.platform] ?? l.platform}
                          </a>
                        ) : (
                          (PLATFORM_LABEL[l.platform] ?? l.platform)
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {formatNumber(l.followers)} seg ·{" "}
                        {l.engagement_rate != null
                          ? `${l.engagement_rate}%`
                          : "—"}{" "}
                        eng
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-5">
            <div className="border-primary bg-card rounded-xl border border-l-3 p-6">
              <h3 className="text-lg font-semibold">
                {isOwner ? "Este é o seu perfil público" : "Interessado em patrocinar?"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {isOwner
                  ? "É assim que as marcas veem você. Mantenha os dados atualizados."
                  : "Envie uma proposta direta com valor, duração e entregas esperadas."}
              </p>
              <Button
                asChild
                size="lg"
                variant={isOwner ? "outline" : "default"}
                className="mt-4 w-full"
              >
                {isOwner ? (
                  <Link href="/perfil">Editar perfil</Link>
                ) : viewerId ? (
                  <Link href={`/propostas/nova?para=${profile.id}`}>
                    Enviar proposta
                  </Link>
                ) : (
                  <Link href={`/login?next=/p/${profile.id}`}>
                    Entrar para enviar proposta
                  </Link>
                )}
              </Button>
            </div>

            <Panel title="Lista">
              {listState ? (
                <>
                  <p className="text-sm font-medium">{listState.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {listState.kind === "member" &&
                      athlete?.list_position != null && (
                        <span className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-medium">
                          Posição atual: {athlete.list_position}º
                        </span>
                      )}
                    {listState.kind === "shark" && (
                      <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-semibold">
                        Shark Tank
                        {athlete?.list_shark_tank_date &&
                          ` · próxima etapa ${formatDateBR(athlete.list_shark_tank_date)}`}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Não faz parte de nenhuma lista.
                </p>
              )}
            </Panel>

            {packages.length > 0 ? (
              <Panel title="Tabela de preços">
                <ul className="flex flex-col divide-y">
                  {packages.map((pkg) => (
                    <li key={pkg.id} className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{pkg.title}</p>
                        {pkg.description && (
                          <p className="text-muted-foreground text-xs">
                            {pkg.description}
                          </p>
                        )}
                      </div>
                      {canSeeValues && (
                        <span className="font-[family-name:var(--font-heading)] shrink-0 text-lg">
                          {pkg.price != null
                            ? formatBRL(pkg.price)
                            : "sob consulta"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {!canSeeValues && (
                  <p className="text-muted-foreground mt-3 text-xs">
                    Os valores ficam visíveis para empresas.
                  </p>
                )}
              </Panel>
            ) : (
              canSeeValues &&
              faixa && (
                <Panel title="Valor desejado">
                  <p className="text-sm">
                    <span className="font-[family-name:var(--font-heading)] text-2xl">
                      {faixa}
                    </span>
                    <span className="text-muted-foreground"> / mês</span>
                  </p>
                </Panel>
              )
            )}

            {athlete?.sponsor_categories &&
              athlete.sponsor_categories.length > 0 && (
                <Panel title="Aceita patrocínio de">
                  <Pills items={athlete.sponsor_categories} />
                </Panel>
              )}

            {athlete?.availability_notes && (
              <Panel title="Disponibilidade">
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {athlete.availability_notes}
                </p>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card rounded-xl border p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-heading)] text-3xl">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function Pills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-medium"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
