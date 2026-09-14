import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatDateBR } from "@/lib/format";
import { monthGrid, MONTH_LABELS, WEEKDAY_LABELS, todayISO } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { Deliverable } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Calendário — Sponsas" };

type Row = Deliverable & {
  sponsorship: {
    id: string;
    athlete_id: string;
    company_id: string;
    company: { name: string | null } | null;
    athlete: { name: string | null } | null;
  } | null;
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-primary",
  submitted: "bg-accent-foreground",
  approved: "bg-success",
  rejected: "bg-destructive",
};

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; d?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/calendario");

  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.y) || now.getUTCFullYear();
  const month = sp.m ? Math.min(11, Math.max(0, Number(sp.m) - 1)) : now.getUTCMonth();

  const cells = monthGrid(year, month);
  const rangeStart = cells[0].iso;
  const rangeEnd = cells[cells.length - 1].iso;

  const { data } = await supabase
    .from("deliverables")
    .select(
      "*, sponsorship:sponsorships(id, athlete_id, company_id, company:profiles!sponsorships_company_id_fkey(name), athlete:profiles!sponsorships_athlete_id_fkey(name))",
    )
    .gte("due_date", rangeStart)
    .lte("due_date", rangeEnd)
    .order("due_date");

  const rows = (data ?? []) as unknown as Row[];
  const byDay = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.due_date) continue;
    const arr = byDay.get(r.due_date) ?? [];
    arr.push(r);
    byDay.set(r.due_date, arr);
  }

  const today = todayISO();
  const selected = sp.d && byDay.has(sp.d) ? sp.d : byDay.has(today) ? today : null;
  const selectedItems = selected ? (byDay.get(selected) ?? []) : [];

  const prevMonth = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const nextMonth = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };
  const linkFor = (over: { y: number; m: number; d?: string }) =>
    `/calendario?y=${over.y}&m=${over.m}${over.d ? `&d=${over.d}` : ""}`;

  function counterpart(r: Row): string {
    const isMe = r.sponsorship?.athlete_id === user!.id;
    const name = isMe ? r.sponsorship?.company?.name : r.sponsorship?.athlete?.name;
    return name ?? "—";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl">Calendário</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Suas entregas combinadas com os patrocínios, mês a mês.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <Link
          href={linkFor(prevMonth)}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 items-center justify-center rounded-md"
          aria-label="Mês anterior"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <h2 className="text-xl">
          {MONTH_LABELS[month]} {year}
        </h2>
        <Link
          href={linkFor(nextMonth)}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 items-center justify-center rounded-md"
          aria-label="Próximo mês"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="text-muted-foreground py-1 text-xs font-medium">
            {w}
          </div>
        ))}
        {cells.map((c) => {
          const items = byDay.get(c.iso) ?? [];
          const isToday = c.iso === today;
          const isSelected = c.iso === selected;
          return (
            <Link
              key={c.iso}
              href={linkFor({ y: year, m: month + 1, d: c.iso })}
              className={cn(
                "border-border flex min-h-16 flex-col items-center gap-1 rounded-md border p-1 text-xs transition-colors sm:min-h-20",
                !c.inMonth && "text-muted-foreground/40 bg-muted/30",
                isSelected && "border-primary",
                !isSelected && "hover:bg-accent/50",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  isToday && "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {c.day}
              </span>
              {items.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5">
                  {items.slice(0, 4).map((it) => (
                    <span
                      key={it.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        STATUS_DOT[it.status] ?? "bg-muted-foreground",
                      )}
                    />
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="text-xl">
          {selected ? formatDateBR(selected) : "Selecione um dia"}
          {selected === today && (
            <span className="text-primary ml-2 text-sm font-normal">hoje</span>
          )}
        </h2>
        {selectedItems.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nenhuma entrega marcada pra esse dia.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {selectedItems.map((it) => (
              <Link
                key={it.id}
                href={`/patrocinios/${it.sponsorship?.id ?? ""}`}
                className="border-border border-l-primary bg-card hover:border-l-primary/60 flex items-center justify-between gap-4 rounded-lg border border-l-3 p-4 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium">{deliverableLabel(it.type)}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {counterpart(it)}
                    {it.description ? ` · ${it.description}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px]",
                    it.status === "approved" && "bg-success-soft text-success",
                    it.status === "rejected" &&
                      "bg-destructive/10 text-destructive",
                    it.status === "submitted" &&
                      "bg-accent text-accent-foreground",
                    it.status === "pending" && "bg-muted text-muted-foreground",
                  )}
                >
                  {it.status === "pending"
                    ? "Pendente"
                    : it.status === "submitted"
                      ? "Em revisão"
                      : it.status === "approved"
                        ? "Aprovada"
                        : "Recusada"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
