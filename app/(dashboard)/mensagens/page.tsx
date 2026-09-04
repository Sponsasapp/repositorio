import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/relative-time";
import { Avatar } from "@/components/avatar";

export const metadata: Metadata = { title: "Mensagens — Sponsas" };

type Participant = { id: string; name: string; photo_url: string | null };

export default async function MensagensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mensagens");

  const { data: convRaw } = await supabase
    .from("conversations")
    .select(
      "id, last_message_at, profile_a:profiles!conversations_profile_a_fkey(id, name, photo_url), profile_b:profiles!conversations_profile_b_fkey(id, name, photo_url)",
    )
    .or(`profile_a.eq.${user.id},profile_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  type ConvRow = {
    id: string;
    last_message_at: string;
    profile_a: Participant;
    profile_b: Participant;
  };
  const conversations = (convRaw ?? []) as unknown as ConvRow[];
  const ids = conversations.map((c) => c.id);

  const { data: msgRaw } =
    ids.length > 0
      ? await supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at, read_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
      : { data: [] };

  type MsgRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  };
  const messages = (msgRaw ?? []) as MsgRow[];

  const rows = conversations.map((c) => {
    const other = c.profile_a.id === user.id ? c.profile_b : c.profile_a;
    const convMessages = messages.filter((m) => m.conversation_id === c.id);
    const last = convMessages[0];
    const unread = convMessages.filter(
      (m) => m.sender_id !== user.id && !m.read_at,
    ).length;
    return { conversation: c, other, last, unread };
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-4xl">Mensagens</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Converse direto com pilotos e empresas.
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-12 text-sm">
          Nenhuma conversa ainda. Abra o perfil de um piloto ou empresa e
          clique em &ldquo;Mandar mensagem&rdquo;.
        </p>
      ) : (
        <ul className="border-border mt-8 flex flex-col divide-y rounded-xl border">
          {rows.map(({ conversation, other, last, unread }) => (
            <li key={conversation.id}>
              <Link
                href={`/mensagens/${conversation.id}`}
                className="hover:bg-accent/50 flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <Avatar
                  src={other.photo_url}
                  name={other.name}
                  className="size-11 shrink-0 text-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={
                        unread > 0 ? "truncate font-semibold" : "truncate"
                      }
                    >
                      {other.name}
                    </p>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {timeAgo(conversation.last_message_at)}
                    </span>
                  </div>
                  <p
                    className={
                      unread > 0
                        ? "text-foreground mt-0.5 truncate text-sm font-medium"
                        : "text-muted-foreground mt-0.5 truncate text-sm"
                    }
                  >
                    {last
                      ? `${last.sender_id === user.id ? "Você: " : ""}${last.body}`
                      : "Sem mensagens ainda"}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                    {unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
