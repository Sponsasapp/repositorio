"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deliverableLabel } from "@/lib/deliverables";
import { monthGrid, WEEKDAY_LABELS, todayISO } from "@/lib/calendar";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  type: string;
  due_date: string | null;
  status: string;
  company: string | null;
};

/**
 * Mini calendário do header — mesma ideia do sininho: poll a cada 60s, RLS
 * já restringe às entregas do usuário. Abre um dropdown com o mês atual e
 * as entregas de hoje.
 */
export function CalendarIcon({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);

    const supabase = createClient();
    const { data } = await supabase
      .from("deliverables")
      .select(
        "id, type, due_date, status, sponsorship:sponsorships(athlete_id, company:profiles!sponsorships_company_id_fkey(name))",
      )
      .gte("due_date", start)
      .lte("due_date", end)
      .eq("status", "pending");

    const rows = (data ?? []) as unknown as {
      id: string;
      type: string;
      due_date: string | null;
      status: string;
      sponsorship: { athlete_id: string; company: { name: string | null } | null } | null;
    }[];
    setItems(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        due_date: r.due_date,
        status: r.status,
        company:
          r.sponsorship?.athlete_id === userId
            ? (r.sponsorship?.company?.name ?? null)
            : null,
      })),
    );
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const today = todayISO();
  const byDay = new Map<string, Item[]>();
  for (const it of items) {
    if (!it.due_date) continue;
    const arr = byDay.get(it.due_date) ?? [];
    arr.push(it);
    byDay.set(it.due_date, arr);
  }
  const hoje = byDay.get(today) ?? [];
  const now = new Date();
  const cells = monthGrid(now.getUTCFullYear(), now.getUTCMonth());

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Calendário"
        title="Calendário"
        className="text-muted-foreground hover:bg-accent hover:text-foreground relative flex size-9 items-center justify-center rounded-md"
      >
        <CalendarDaysIcon className="size-5" />
        {hoje.length > 0 && (
          <span className="bg-primary border-background absolute top-1 right-1 size-2.5 rounded-full border-2" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="border-border bg-card absolute right-0 z-50 mt-2 w-72 max-w-[90vw] overflow-hidden rounded-lg border shadow-lg">
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Calendário</p>
              <Link
                href="/calendario"
                onClick={() => setOpen(false)}
                className="text-primary text-xs hover:underline"
              >
                ver completo
              </Link>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAY_LABELS.map((w, i) => (
                  <span key={i} className="text-muted-foreground text-[10px]">
                    {w}
                  </span>
                ))}
                {cells.map((c) => {
                  const has = (byDay.get(c.iso) ?? []).length > 0;
                  const isToday = c.iso === today;
                  return (
                    <span
                      key={c.iso}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[11px]",
                        !c.inMonth && "text-muted-foreground/30",
                        isToday && "bg-primary text-primary-foreground font-semibold",
                        !isToday && has && "text-foreground font-medium",
                      )}
                    >
                      {c.day}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="border-border border-t px-4 py-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Hoje
              </p>
              {hoje.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  Nada pra entregar hoje.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {hoje.map((it) => (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span>{deliverableLabel(it.type)}</span>
                      {it.company && (
                        <span className="text-muted-foreground truncate">
                          {it.company}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
