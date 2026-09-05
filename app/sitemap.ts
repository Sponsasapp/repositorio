import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

// Revalida de hora em hora — não precisa de sessão/cookies aqui.
export const revalidate = 3600;

const STATIC: { path: string; priority: number; freq: "daily" | "weekly" }[] = [
  { path: "", priority: 1, freq: "daily" },
  { path: "/pilotos", priority: 0.8, freq: "daily" },
  { path: "/empresas", priority: 0.8, freq: "daily" },
  { path: "/pistas", priority: 0.7, freq: "daily" },
  { path: "/eventos", priority: 0.7, freq: "daily" },
  { path: "/midias", priority: 0.7, freq: "daily" },
  { path: "/oportunidades", priority: 0.8, freq: "daily" },
  { path: "/como-funciona", priority: 0.6, freq: "weekly" },
  { path: "/para-empresas", priority: 0.6, freq: "weekly" },
  { path: "/para-pilotos", priority: 0.6, freq: "weekly" },
  { path: "/planos", priority: 0.6, freq: "weekly" },
  { path: "/termos", priority: 0.3, freq: "weekly" },
  { path: "/privacidade", priority: 0.3, freq: "weekly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = STATIC.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  let dynamicRoutes: MetadataRoute.Sitemap = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from("profiles")
        .select("id, type, updated_at")
        .in("type", ["athlete", "company", "track", "event", "media"]);
      const prefix: Record<string, string> = {
        athlete: "p",
        company: "e",
        track: "pista",
        event: "evento",
        media: "m",
      };
      dynamicRoutes = (data ?? [])
        .filter((p) => prefix[p.type])
        .map((p) => ({
          url: `${SITE_URL}/${prefix[p.type]}/${p.id}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }));
    } catch {
      // Sitemap só com as rotas estáticas ainda é válido.
    }
  }

  return [...staticRoutes, ...dynamicRoutes];
}
