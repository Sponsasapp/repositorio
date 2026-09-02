export type NavLink = { href: string; label: string; soon?: boolean };

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Painel" },
  { href: "/perfil", label: "Meu perfil" },
  { href: "/pilotos", label: "Explorar pilotos" },
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/propostas", label: "Propostas" },
  { href: "/patrocinios", label: "Patrocínios" },
  { href: "/entregas", label: "Entregas" },
  { href: "/configuracoes", label: "Configurações" },
];
