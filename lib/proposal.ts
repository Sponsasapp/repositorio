import type { ProposalStatus } from "@/lib/types/database.types";

export const PROPOSAL_STATUS: Record<
  ProposalStatus,
  { label: string; cls: string }
> = {
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  accepted: { label: "Aceita", cls: "bg-success-soft text-success" },
  rejected: { label: "Recusada", cls: "bg-muted text-muted-foreground" },
  withdrawn: { label: "Retirada", cls: "bg-muted text-muted-foreground" },
};
