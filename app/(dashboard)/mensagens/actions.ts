"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/email";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Botão "Mandar mensagem" num perfil público — acha ou cria a conversa e abre. */
export async function iniciarConversa(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) redirect(`/login?next=/mensagens`);

  const other = String(formData.get("para") ?? "");
  if (!other || other === user.id) redirect("/mensagens");

  const { data: conversationId } = await supabase.rpc(
    "get_or_create_conversation",
    { p_other: other },
  );
  if (!conversationId) redirect("/mensagens");

  redirect(`/mensagens/${conversationId}`);
}

export async function enviarMensagem(formData: FormData): Promise<void> {
  const { supabase, user } = await ctx();
  if (!user) return;

  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!conversationId || !body) return;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("profile_a, profile_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return;

  const otherId =
    conversation.profile_a === user.id
      ? conversation.profile_b
      : conversation.profile_a;

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });
  if (error) return;

  const { data: sender } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  after(() =>
    notifyUser(otherId, {
      type: "message_received",
      subject: "Nova mensagem na Sponsas",
      title: `${sender?.name ?? "Alguém"} te mandou uma mensagem`,
      body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
      cta: { label: "Ver mensagem", path: `/mensagens/${conversationId}` },
    }),
  );

  revalidatePath(`/mensagens/${conversationId}`);
  revalidatePath("/mensagens");
}
