import type { SponsorshipStatus } from "@/lib/types/database.types";

export const SPONSORSHIP_STATUS: Record<
  SponsorshipStatus,
  { label: string; cls: string }
> = {
  active: { label: "Ativo", cls: "bg-success-soft text-success" },
  ended: { label: "Encerrado", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};
