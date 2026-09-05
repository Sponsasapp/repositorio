import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSponsee } from "@/lib/sponsee-data";
import { SponseePublic, Panel } from "@/components/sponsee-public";
import { SITE_URL } from "@/lib/site";
import type { MediaProfile } from "@/lib/types/database.types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getSponsee(id, "media", "media_profiles");
  if (!data) return { title: "Mídia não encontrada — Sponsas" };
  return {
    title: `${data.profile.name} — Sponsas`,
    description:
      data.profile.bio ??
      `${data.profile.name} — mídia do esporte buscando patrocínio na Sponsas.`,
    alternates: { canonical: `${SITE_URL}/m/${id}` },
  };
}

export default async function MidiaPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSponsee(id, "media", "media_profiles");
  if (!data) notFound();
  const m = data.detail as MediaProfile | null;

  const subtitle = [
    (m?.roles ?? []).join(" · "),
    [data.profile.city, data.profile.state].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SponseePublic
      profile={data.profile}
      type="media"
      subtitle={subtitle}
      socials={data.socials}
      viewerId={data.viewerId}
      viewerType={data.viewerType}
      canMessage={data.canMessage}
      messageHint={data.messageHint}
    >
      <Panel title="A mídia">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {m?.roles && m.roles.length > 0 && (
            <Row k="Atuação" v={m.roles.join(", ")} />
          )}
          {m?.portfolio_url && (
            <Row
              k="Portfólio"
              v={
                <a
                  href={m.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  abrir
                </a>
              }
            />
          )}
          {m?.website && (
            <Row
              k="Site"
              v={
                <a
                  href={m.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {m.website}
                </a>
              }
            />
          )}
          {m?.instagram && <Row k="Instagram" v={m.instagram} />}
        </dl>
      </Panel>
    </SponseePublic>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
