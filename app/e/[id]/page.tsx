import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, initials } from "@/lib/format";
import { matchesCampaignRegion } from "@/lib/regions";
import { modalityLabel } from "@/lib/sports";
import { SITE_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { RegionFit } from "@/components/region-fit";
import {
  OpportunityCard,
  type OpportunityCardData,
} from "@/components/opportunity-card";

async function getEmpresa(id: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile || profile.type !== "company") return null;

  const [{ data: company }, { data: opps }, { data: auth }] = await Promise.all([
    supabase
      .from("company_profiles")
      .select("*")
      .eq("profile_id", id)
      .maybeSingle(),
    supabase
      .from("opportunities")
      .select(
        "id, title, budget, duration_months, region, expected_deliverables, status, created_at",
      )
      .eq("company_id", id)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const viewerId = auth.user?.id ?? null;
  let viewerType: string | null = null;
  let viewerState: string | null = null;
  if (viewerId) {
    const { data: viewer } = await supabase
      .from("profiles")
      .select("type, state")
      .eq("id", viewerId)
      .maybeSingle();
    viewerType = viewer?.type ?? null;
    viewerState = viewer?.state ?? null;
  }

  return {
    profile,
    company,
    opportunities: (opps ?? []) as unknown as Omit<
      OpportunityCardData,
      "companyName"
    >[],
    viewerId,
    viewerType,
    viewerState,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getEmpresa(id);
  if (!data) return { title: "Empresa não encontrada — Sponsas" };
  const url = `${SITE_URL}/e/${id}`;
  const description =
    data.company?.description ??
    `${data.profile.name} na Sponsas — marca buscando pilotos para patrocinar.`;
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

export default async function PerfilEmpresaPublicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEmpresa(id);
  if (!data) notFound();

  const { profile, company, opportunities, viewerId, viewerType, viewerState } =
    data;
  const isOwner = viewerId === profile.id;
  const isAthlete = viewerType === "athlete";

  const local = [profile.city, profile.state].filter(Boolean).join(", ");
  const linha = [company?.segment, local].filter(Boolean).join(" · ");

  const opps: OpportunityCardData[] = opportunities.map((o) => ({
    ...o,
    companyName: profile.name,
  }));

  const regionFit = isAthlete
    ? matchesCampaignRegion(viewerState, company?.region_of_interest)
    : null;

  const hasCampaign = Boolean(
    company?.campaign_goal ||
      company?.target_audience ||
      company?.region_of_interest ||
      company?.campaign_duration_months != null ||
      company?.budget != null ||
      regionFit !== null,
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
              <h1 className="text-5xl">{profile.name}</h1>
              {linha && <p className="mt-1 text-sm text-white/70">{linha}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="mx-auto -mt-12 max-w-5xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-5">
            {company?.description && (
              <Panel title="Sobre">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {company.description}
                </p>
              </Panel>
            )}

            {company?.modalities && company.modalities.length > 0 && (
              <Panel title="Patrocina">
                <div className="flex flex-wrap gap-2">
                  {company.modalities.map((mv) => (
                    <span
                      key={mv}
                      className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {modalityLabel(mv)}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {hasCampaign && (
              <Panel title="Campanha de patrocínio">
                <dl className="grid gap-3 text-sm">
                  <Row label="Objetivo" value={company?.campaign_goal} />
                  <Row label="Público-alvo" value={company?.target_audience} />
                  <Row
                    label="Região de interesse"
                    value={company?.region_of_interest}
                  />
                  {company?.campaign_duration_months != null && (
                    <Row
                      label="Duração"
                      value={`${company.campaign_duration_months} meses`}
                    />
                  )}
                  {company?.budget != null && (
                    <Row
                      label="Orçamento"
                      value={`${formatBRL(company.budget)} / mês`}
                    />
                  )}
                </dl>
                {regionFit !== null && (
                  <div className="mt-4">
                    <RegionFit
                      fit={regionFit}
                      region={company?.region_of_interest}
                    />
                  </div>
                )}
              </Panel>
            )}

            {opps.length > 0 && (
              <Panel title="Oportunidades abertas">
                <div className="flex flex-col gap-3">
                  {opps.map((o) => (
                    <OpportunityCard key={o.id} opp={o} />
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-5">
            <div className="border-primary bg-card rounded-xl border border-l-3 p-6">
              <h3 className="text-lg font-semibold">
                {isOwner
                  ? "Este é o seu perfil público"
                  : "Quer patrocínio desta marca?"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {isOwner
                  ? "É assim que os pilotos veem sua marca. Mantenha os dados atualizados."
                  : "Envie uma proposta com suas entregas, alcance e o valor que você busca."}
              </p>
              <Button
                asChild
                size="lg"
                variant={isOwner ? "outline" : "default"}
                className="mt-4 w-full"
              >
                {isOwner ? (
                  <Link href="/perfil">Editar perfil</Link>
                ) : isAthlete ? (
                  <Link href={`/propostas/nova?para=${profile.id}`}>
                    Enviar proposta
                  </Link>
                ) : viewerId ? (
                  <Link href="/oportunidades">Ver oportunidades</Link>
                ) : (
                  <Link href={`/login?next=/e/${profile.id}`}>
                    Entrar para enviar proposta
                  </Link>
                )}
              </Button>
            </div>

            {(company?.website || company?.instagram) && (
              <Panel title="Links">
                <ul className="flex flex-col gap-2 text-sm">
                  {company?.website && (
                    <li>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        Site
                      </a>
                    </li>
                  )}
                  {company?.instagram && (
                    <li>{instagramLink(company.instagram)}</li>
                  )}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function instagramLink(handle: string) {
  const clean = handle
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/$/, "");
  return (
    <a
      href={`https://instagram.com/${clean}`}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      Instagram (@{clean})
    </a>
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

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}
