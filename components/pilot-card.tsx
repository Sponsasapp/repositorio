import Link from "next/link";
import { CarFrontIcon } from "lucide-react";
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

/**
 * Estilo por tier — a carta em si vira o troféu: quanto mais alto o rank,
 * mais "rara" a moldura. `iniciante`/sem rank cai no neutro.
 */
const TIER_CARD: Record<
  RankTier,
  { border: string; header: string; text: string }
> = {
  elite: {
    border: "border-primary",
    header: "bg-primary",
    text: "text-primary-foreground",
  },
  ouro: {
    border: "border-amber-400",
    header: "bg-amber-400",
    text: "text-amber-950",
  },
  prata: {
    border: "border-slate-300",
    header: "bg-slate-300",
    text: "text-slate-800",
  },
  bronze: {
    border: "border-orange-700",
    header: "bg-orange-700",
    text: "text-orange-50",
  },
  iniciante: {
    border: "border-border",
    header: "bg-muted",
    text: "text-muted-foreground",
  },
};
const DEFAULT_CARD = TIER_CARD.iniciante;

export function PilotCard({ pilot }: { pilot: PilotCardData }) {
  const linha = [pilot.modality, pilot.category, pilot.state]
    .filter(Boolean)
    .join(" · ");
  const style = pilot.tier ? TIER_CARD[pilot.tier] : DEFAULT_CARD;
  const t = tierInfo(pilot.tier);

  return (
    <Link
      href={`/p/${pilot.id}`}
      className={cn(
        "group bg-card flex flex-col overflow-hidden rounded-2xl border-2 transition-transform hover:-translate-y-1 hover:shadow-lg",
        style.border,
      )}
    >
      {/* Faixa de topo — como o cabeçalho de uma carta de super trunfo */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5",
          style.header,
          style.text,
        )}
      >
        <span className="text-[10px] font-bold tracking-wide uppercase">
          {t?.label ?? "Novo"}
        </span>
        {pilot.isPro && (
          <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[9px] font-bold">
            PRO
          </span>
        )}
      </div>

      {/* Foto do carro em evidência + piloto em PIP */}
      <div className="bg-navy relative aspect-[4/3] w-full">
        {pilot.car_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pilot.car_photo_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <CarFrontIcon className="size-12 text-white/15" strokeWidth={1.5} />
          </div>
        )}
        <Avatar
          src={pilot.photo_url}
          name={pilot.name}
          tone="primary"
          className="border-card absolute -bottom-5 left-3 size-12 border-4 text-sm shadow-md"
        />
      </div>

      <div className="flex flex-1 flex-col p-4 pt-7">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">{pilot.name}</h3>
        </div>
        <p className="text-muted-foreground mb-1 text-[13px]">{linha || "—"}</p>

        <dl className="mt-2 flex flex-col text-xs">
          <StatRow label="Seguidores" value={formatCompact(pilot.followers || null) || "—"} />
          <StatRow
            label="Engajamento"
            value={pilot.engagement != null ? `${pilot.engagement.toFixed(1)}%` : "—"}
          />
          <StatRow label="Rank Sponsas" value={t?.label ?? "Sem rank ainda"} highlight />
        </dl>
      </div>
    </Link>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border-border flex items-center justify-between border-t border-dashed py-1.5 first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-[family-name:var(--font-heading)] text-sm",
          highlight && "text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
