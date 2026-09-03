import Link from "next/link";
import { formatCompact } from "@/lib/format";
import { tierInfo } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import type { RankTier } from "@/lib/types/database.types";

export type PilotCardData = {
  id: string;
  name: string;
  photo_url: string | null;
  car_photo_url: string | null;
  city: string | null;
  state: string | null;
  modality: string | null;
  category: string | null;
  followers: number;
  engagement: number | null;
  tier: RankTier | null;
  isPro?: boolean;
};

export function PilotCard({ pilot }: { pilot: PilotCardData }) {
  const linha = [pilot.modality, pilot.category, pilot.state]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/p/${pilot.id}`}
      className="border-border border-l-primary bg-card hover:border-l-primary/60 flex flex-col overflow-hidden rounded-lg border border-l-3 transition-colors"
    >
      {pilot.car_photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pilot.car_photo_url}
          alt=""
          className="aspect-[16/9] w-full object-cover"
        />
      )}
      <div
        className={cn(
          "flex flex-1 flex-col p-5",
          pilot.car_photo_url && "pt-4",
        )}
      >
      <Avatar
        src={pilot.photo_url}
        name={pilot.name}
        className="mb-3.5 size-11 text-base"
      />
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{pilot.name}</h3>
        {pilot.isPro && (
          <span className="bg-bege text-bege-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
            PRO
          </span>
        )}
        {tierInfo(pilot.tier) && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              tierInfo(pilot.tier)!.badgeCls
            }`}
          >
            {tierInfo(pilot.tier)!.label}
          </span>
        )}
      </div>
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
      </div>
    </Link>
  );
}
