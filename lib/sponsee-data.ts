import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileType, SocialLink } from "@/lib/types/database.types";

type Table = "track_profiles" | "event_profiles" | "media_profiles";

/**
 * Carrega o perfil público de um patrocinado (pista/evento/mídia) + a
 * linha de detalhe do tipo + o contexto de quem está vendo (pra CTA/chat).
 */
export async function getSponsee(id: string, type: ProfileType, table: Table) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!profile || profile.type !== type) return null;

  const [{ data: detail }, { data: socials }, { data: auth }] =
    await Promise.all([
      supabase.from(table).select("*").eq("profile_id", id).maybeSingle(),
      supabase
        .from("social_links")
        .select("*")
        .eq("profile_id", id)
        .order("followers", { ascending: false, nullsFirst: false }),
      supabase.auth.getUser(),
    ]);

  const viewerId = auth.user?.id ?? null;
  let viewerType: ProfileType | null = null;
  if (viewerId) {
    const { data: v } = await supabase
      .from("profiles")
      .select("type")
      .eq("id", viewerId)
      .maybeSingle();
    viewerType = (v?.type as ProfileType) ?? null;
  }

  // Chat: empresa ↔ patrocinado só com proposta entre os dois.
  let canMessage = false;
  let messageHint: string | null = null;
  if (viewerId && viewerId !== id) {
    if (viewerType === "company") {
      const { count } = await supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .or(
          `and(from_profile_id.eq.${viewerId},to_profile_id.eq.${id}),and(from_profile_id.eq.${id},to_profile_id.eq.${viewerId})`,
        );
      canMessage = (count ?? 0) > 0;
      if (!canMessage) messageHint = "Envie uma proposta pra poder conversar.";
    } else {
      messageHint = "Só empresas conversam com este perfil.";
    }
  }

  return {
    profile: profile as Profile,
    detail,
    socials: (socials ?? []) as SocialLink[],
    viewerId,
    viewerType,
    canMessage,
    messageHint,
  };
}
