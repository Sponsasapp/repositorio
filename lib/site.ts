const CANONICAL = "https://sponsas.com.br";

/**
 * URL canônica do site, sem barra final. Ignora domínios `*.vercel.app`
 * (a env do Vercel ficou com `sponsas.vercel.app` do deploy inicial — isso
 * mandava sitemap/og:url pro domínio errado). Preview/local seguem a env.
 */
export const SITE_URL = (() => {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  const url = env && !/\.vercel\.app/i.test(env) ? env : CANONICAL;
  return url.replace(/\/+$/, "");
})();

export const SITE_NAME = "Sponsas";
export const SITE_TAGLINE = "Sponsorship made simple";
export const SITE_DESCRIPTION =
  "Pilotos organizam seu perfil comercial e suas entregas. Marcas encontram quem combina com elas e acompanham cada patrocínio num só lugar.";
