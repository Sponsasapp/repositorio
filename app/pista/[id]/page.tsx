import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSponsee } from "@/lib/sponsee-data";
import { SponseePublic, Panel } from "@/components/sponsee-public";
import { modalityLabel } from "@/lib/sports";
import { SITE_URL } from "@/lib/site";
import type { TrackProfile } from "@/lib/types/database.types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getSponsee(id, "track", "track_profiles");
  if (!data) return { title: "Pista não encontrada — Sponsas" };
  return {
    title: `${data.profile.name} — Sponsas`,
    description:
      data.profile.bio ??
      `${data.profile.name} — pista buscando patrocínio na Sponsas.`,
    alternates: { canonical: `${SITE_URL}/pista/${id}` },
  };
}

export default async function PistaPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSponsee(id, "track", "track_profiles");
  if (!data) notFound();
  const t = data.detail as TrackProfile | null;

  const subtitle = [data.profile.city, data.profile.state]
    .filter(Boolean)
    .join(", ");

  return (
    <SponseePublic
      profile={data.profile}
      type="track"
      subtitle={subtitle}
      socials={data.socials}
      viewerId={data.viewerId}
      viewerType={data.viewerType}
      canMessage={data.canMessage}
      messageHint={data.messageHint}
    >
      <Panel title="A pista">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {t?.layouts && t.layouts.length > 0 && (
            <Row k="Traçados" v={t.layouts.map(modalityLabel).join(", ")} />
          )}
          {t?.length_m != null && <Row k="Extensão" v={`${t.length_m} m`} />}
          {t?.capacity != null && (
            <Row k="Capacidade" v={`${t.capacity} pessoas`} />
          )}
          {t?.website && (
            <Row
              k="Site"
              v={
                <a
                  href={t.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {t.website}
                </a>
              }
            />
          )}
          {t?.instagram && <Row k="Instagram" v={t.instagram} />}
        </dl>
        {t?.sponsor_spaces && (
          <div className="mt-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Espaços para marcas
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {t.sponsor_spaces}
            </p>
          </div>
        )}
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
