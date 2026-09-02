import Link from "next/link";
import { initials } from "@/lib/format";

export type CompanyCardData = {
  id: string;
  name: string;
  logo_url: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  openCount: number;
  isPro?: boolean;
};

export function CompanyCard({ company }: { company: CompanyCardData }) {
  const local = [company.city, company.state].filter(Boolean).join(", ");
  const linha = [company.segment, local].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/e/${company.id}`}
      className="border-border border-l-primary bg-card hover:border-l-primary/60 flex flex-col rounded-lg border border-l-3 p-5 transition-colors"
    >
      <div className="bg-navy text-navy-foreground mb-3.5 flex size-11 items-center justify-center overflow-hidden rounded-lg text-base">
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt={company.name}
            className="size-full object-cover"
          />
        ) : (
          <span className="font-[family-name:var(--font-heading)]">
            {initials(company.name)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{company.name}</h3>
        {company.isPro && (
          <span className="bg-bege text-bege-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
            PRO
          </span>
        )}
      </div>
      <p className="text-muted-foreground mb-3.5 text-[13px]">{linha || "Marca"}</p>
      <div className="text-muted-foreground mt-auto text-xs">
        {company.openCount > 0 ? (
          <span>
            <b className="text-foreground font-[family-name:var(--font-heading)] text-[15px]">
              {company.openCount}
            </b>{" "}
            {company.openCount === 1
              ? "oportunidade aberta"
              : "oportunidades abertas"}
          </span>
        ) : (
          <span>Sem oportunidades abertas</span>
        )}
      </div>
    </Link>
  );
}
