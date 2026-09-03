/** URL canônica do site, sem barra final. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sponsas.com.br"
).replace(/\/+$/, "");

export const SITE_NAME = "Sponsas";
export const SITE_TAGLINE = "Sponsorship made simple";
export const SITE_DESCRIPTION =
  "Pilotos organizam seu perfil comercial e suas entregas. Marcas encontram quem combina com elas e acompanham cada patrocínio num só lugar.";
