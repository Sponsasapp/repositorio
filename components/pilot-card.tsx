import Link from "next/link";
import { formatCompact, initials } from "@/lib/format";

export type PilotCardData = {
  id: string;
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  modality: string | null;
  category: string | null;
  followers: number;
  engagement: number | null;
};

export function PilotCard({ pilot }: { pilot: PilotCardData }) {
  const linha = [pilot.modality, pilot.category, pilot.state]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/p/${pilot.id}`}
      className="border-border border-l-primary bg-card hover:border-l-primary/60 flex flex-col rounded-lg border border-l-3 p-5 transition-colors"
    >
      <div className="bg-navy text-navy-foreground mb-3.5 flex size-11 items-center justify-center overflow-hidden rounded-full text-base">
        {pilot.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pilot.photo_url}
            alt={pilot.name}
            className="size-full object-cover"
          />
        ) : (
          <span className="font-[family-name:var(--font-heading)]">
            {initials(pilot.name)}
          </span>
        )}
      </div>
      <h3 className="font-semibold">{pilot.name}</h3>
      <p className="text-muted-foreground mb-3.5 text-[13px]">{linha || "—"}</p>
      <div className="text-muted-foreground mt-auto flex gap-4 text-xs">
        <span>
          <b className="text-foreground block font-[family-name:var(--font-heading)] text-[15px]">
            {formatCompact(pilot.followers || null)}
          </b>
          seguidores
        </span>
        {pilot.engagement != null && (
          <span>
            <b className="text-foreground block font-[family-name:var(--font-heading)] text-[15px]">
              {pilot.engagement.toFixed(1)}%
            </b>
            engajamento
          </span>
        )}
      </div>
    </Link>
  );
}
