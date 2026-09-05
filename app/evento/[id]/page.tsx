import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSponsee } from "@/lib/sponsee-data";
import { SponseePublic, Panel } from "@/components/sponsee-public";
import { formatDateBR } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { EventProfile } from "@/lib/types/database.types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getSponsee(id, "event", "event_profiles");
  if (!data) return { title: "Evento não encontrado — Sponsas" };
  return {
    title: `${data.profile.name} — Sponsas`,
    description:
      data.profile.bio ??
      `${data.profile.name} — evento buscando patrocínio na Sponsas.`,
    alternates: { canonical: `${SITE_URL}/evento/${id}` },
  };
}

export default async function EventoPublicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSponsee(id, "event", "event_profiles");
  if (!data) notFound();
  const e = data.detail as EventProfile | null;

  const subtitle = [e?.event_kind, data.profile.city, data.profile.state]
    .filter(Boolean)
    .join(" · ");

  return (
    <SponseePublic
      profile={data.profile}
      type="event"
      subtitle={subtitle}
      socials={data.socials}
      viewerId={data.viewerId}
      viewerType={data.viewerType}
      canMessage={data.canMessage}
      messageHint={data.messageHint}
    >
      <Panel title="O evento">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {e?.next_date && (
            <Row k="Próxima data" v={formatDateBR(e.next_date)} />
          )}
          {e?.track_name && <Row k="Local / pista" v={e.track_name} />}
          {e?.expected_public != null && (
            <Row k="Público esperado" v={`${e.expected_public} pessoas`} />
          )}
          {e?.website && (
            <Row
              k="Site"
              v={
                <a
                  href={e.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {e.website}
                </a>
              }
            />
          )}
          {e?.instagram && <Row k="Instagram" v={e.instagram} />}
        </dl>
        {e?.sponsor_packages && (
          <div className="mt-4">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Cotas de patrocínio
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {e.sponsor_packages}
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
