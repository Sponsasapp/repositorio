import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/perfil",
        "/propostas",
        "/patrocinios",
        "/entregas",
        "/configuracoes",
        "/auth/",
        "/login",
        "/cadastro",
        "/recuperar-senha",
        "/redefinir-senha",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
