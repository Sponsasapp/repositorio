"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Ícone de mensagens do header com bolinha de não lida. Mesma ideia do
 * sininho: poll a cada 60s, RLS já restringe às conversas do usuário.
 */
export function MessageIcon({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", userId);
    setUnread(count ?? 0);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Link
      href="/mensagens"
      aria-label={unread > 0 ? `Mensagens (${unread} não lidas)` : "Mensagens"}
      title="Mensagens"
      className="text-muted-foreground hover:bg-accent hover:text-foreground relative flex size-9 items-center justify-center rounded-md"
    >
      <MessageCircleIcon className="size-5" />
      {unread > 0 && (
        <span className="bg-primary border-background absolute top-1 right-1 size-2.5 rounded-full border-2" />
      )}
    </Link>
  );
}
