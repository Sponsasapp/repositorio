"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types/database.types";

/**
 * Lista de mensagens de uma conversa. Recebe as mensagens já renderizadas no
 * servidor e faz poll a cada 5s pra pegar o que a outra pessoa mandou — sem
 * realtime/websocket, é chat interno de MVP, não precisa da infra toda.
 */
export function MessageThread({
  conversationId,
  meId,
  initialMessages,
  otherName,
}: {
  conversationId: string;
  meId: string;
  initialMessages: Message[];
  otherName: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sincroniza com o servidor depois de enviar (revalidatePath manda um
    // initialMessages novo) — o poll cobre o resto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(initialMessages);
  }, [initialMessages]);

  const poll = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) {
      setMessages(data as Message[]);
      supabase.rpc("mark_messages_read", { p_conversation: conversationId });
    }
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("mark_messages_read", { p_conversation: conversationId });
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [conversationId, poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        Diga oi — sua mensagem chega direto pra {otherName}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {messages.map((m) => {
        const mine = m.sender_id === meId;
        return (
          <div
            key={m.id}
            className={cn("flex", mine ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                mine
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
              )}
            >
              <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  mine ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
