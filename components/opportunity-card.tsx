import Link from "next/link";
import { formatBRL } from "@/lib/format";
import { timeAgo } from "@/lib/relative-time";
import { deliverableLabel } from "@/lib/deliverables";

export type OpportunityCardData = {
  id: string;
  title: string;
  budget: number | null;
  duration_months: number | null;
  region: string | null;
  expected_deliverables: string[] | null;
  status: "open" | "closed";
  created_at: string;
  companyName: string | null;
};

export function OpportunityCard({ opp }: { opp: OpportunityCardData }) {
  return (
    <Link
      href={`/oportunidades/${opp.id}`}
      className="border-border border-l-primary bg-card hover:border-l-primary/60 flex flex-col rounded-lg border border-l-3 p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{opp.title}</h3>
          <p className="text-muted-foreground text-[13px]">
            {opp.companyName ?? "Empresa"} · {timeAgo(opp.created_at)}
          </p>
        </div>
        {opp.status === "closed" && (
          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px]">
            Encerrada
          </span>
        )}
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {opp.budget != null && (
          <span>
            <b className="text-foreground">{formatBRL(opp.budget)}</b>/mês
          </span>
        )}
        {opp.duration_months != null && <span>{opp.duration_months} meses</span>}
        {opp.region && <span>{opp.region}</span>}
      </div>

      {opp.expected_deliverables && opp.expected_deliverables.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opp.expected_deliverables.slice(0, 4).map((d) => (
            <span
              key={d}
              className="bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            >
              {deliverableLabel(d)}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
