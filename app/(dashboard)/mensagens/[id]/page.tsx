import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { MessageThread } from "@/components/messages/message-thread";
import { enviarMensagem } from "../actions";
import type { Message, ProfileType } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Mensagens — Sponsas" };

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mensagens/${id}`);

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, profile_a, profile_b")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const otherId =
    conversation.profile_a === user.id
      ? conversation.profile_b
      : conversation.profile_a;

  const { data: other } = await supabase
    .from("profiles")
    .select("id, name, photo_url, type")
    .eq("id", otherId)
    .maybeSingle();
  if (!other) notFound();

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  const messages = (msgs ?? []) as Message[];

  const publicPath = other.type === ("company" as ProfileType) ? "e" : "p";

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div className="border-border flex items-center gap-3 border-b pb-4">
        <Link href="/mensagens" className="text-muted-foreground text-sm">
          ← Mensagens
        </Link>
      </div>
      <Link
        href={`/${publicPath}/${other.id}`}
        className="border-border flex items-center gap-3 border-b py-4"
      >
        <Avatar src={other.photo_url} name={other.name} className="size-10 text-sm" />
        <p className="font-semibold">{other.name}</p>
      </Link>

      <div className="flex-1 overflow-y-auto py-4">
        <MessageThread
          conversationId={id}
          meId={user.id}
          initialMessages={messages}
          otherName={other.name}
        />
      </div>

      <form action={enviarMensagem} className="border-border flex gap-2 border-t pt-4">
        <input type="hidden" name="conversation_id" value={id} />
        <textarea
          key={messages.length}
          name="body"
          required
          rows={1}
          placeholder="Escreva uma mensagem…"
          className="border-input bg-card max-h-32 min-h-10 flex-1 resize-none rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-10 shrink-0 rounded-lg px-4 text-sm font-medium"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
