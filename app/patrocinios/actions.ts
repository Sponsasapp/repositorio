"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function encerrarPatrocinio(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const id = String(formData.get("sponsorship_id") ?? "");
  if (!id) return;

  // RLS: só as partes do patrocínio conseguem atualizar.
  await supabase
    .from("sponsorships")
    .update({ status: "ended" })
    .eq("id", id)
    .eq("status", "active");

  revalidatePath(`/patrocinios/${id}`);
  revalidatePath("/patrocinios");
}
