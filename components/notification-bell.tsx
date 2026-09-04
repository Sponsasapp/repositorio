"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/database.types";

/** "Hoje, 14:32" / "Ontem, 14:32" / "04/09, 14:32" — pra saber na hora qual é a mais recente. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) return `Hoje, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Ontem, ${time}`;
  const date = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${date}, ${time}`;
}

/**
 * Sininho de notificações do header. Busca as últimas notificações do
 * usuário (RLS já restringe às suas próprias) e marca como lidas ao abrir o
 * dropdown. Sem realtime — dá conta do MVP com uma checagem a cada 60s.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .limit(15);
    setItems((data ?? []) as Notification[]);
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    // Busca no mount + a cada 60s. Sem lib de data-fetching pra não
    // adicionar dependência só por causa de um sininho.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) =>
      prev.map((n) =>
        n.read_at ? n : { ...n, read_at: new Date().toISOString() },
      ),
    );
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificações"
        className="text-muted-foreground hover:bg-accent hover:text-foreground relative flex size-9 items-center justify-center rounded-md"
      >
        <BellIcon className="size-5" />
        {unread > 0 && (
          <span className="bg-primary border-background absolute top-1 right-1 size-2.5 rounded-full border-2" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="border-border bg-card absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-lg border shadow-lg">
            <div className="border-border border-b px-4 py-3">
              <p className="text-sm font-semibold">Notificações</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!loaded ? (
                <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                  Carregando…
                </p>
              ) : items.length === 0 ? (
                <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                  Nenhuma notificação ainda.
                </p>
              ) : (
                <ul className="divide-y">
                  {items.map((n) => (
                    <li key={n.id}>
                      <NotificationRow n={n} onNavigate={() => setOpen(false)} />
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

function NotificationRow({
  n,
  onNavigate,
}: {
  n: Notification;
  onNavigate: () => void;
}) {
  const body = (
    <div
      className={cn(
        "flex gap-2.5 px-4 py-3 text-sm",
        !n.read_at && "bg-accent/50",
      )}
    >
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          n.read_at ? "bg-transparent" : "bg-primary",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{n.title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>
        <p className="text-muted-foreground mt-1 text-[11px]">
          {formatDateTime(n.created_at)}
        </p>
      </div>
    </div>
  );

  if (!n.cta_path) return body;

  return (
    <Link
      href={n.cta_path}
      onClick={onNavigate}
      className="hover:bg-accent/70 block"
    >
      {body}
    </Link>
  );
}
