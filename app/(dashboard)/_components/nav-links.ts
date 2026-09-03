export type NavLink = { href: string; label: string; soon?: boolean };

/** Itens acima do bloco de esportes (ver components/sport-nav.tsx). */
export const NAV_TOP: NavLink[] = [
  { href: "/dashboard", label: "Painel" },
  { href: "/perfil", label: "Meu perfil" },
];

/** Itens abaixo do bloco de esportes. */
export const NAV_BOTTOM: NavLink[] = [
  { href: "/rank", label: "Rank Sponsas" },
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/propostas", label: "Propostas" },
  { href: "/patrocinios", label: "Patrocínios" },
  { href: "/entregas", label: "Entregas" },
  { href: "/configuracoes", label: "Configurações" },
];

/** Lista achatada — usada onde não há hierarquia de esporte. */
export const NAV_LINKS: NavLink[] = [
  ...NAV_TOP,
  { href: "/pilotos", label: "Explorar pilotos" },
  { href: "/empresas", label: "Explorar empresas" },
  ...NAV_BOTTOM,
];
