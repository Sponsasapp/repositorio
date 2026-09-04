import type { ProfileType } from "@/lib/types/database.types";

export type NavLink = { href: string; label: string; soon?: boolean };

/** Itens acima do bloco de esportes (ver components/sport-nav.tsx). */
export function navTop(type: ProfileType): NavLink[] {
  const items: NavLink[] = [
    { href: "/dashboard", label: "Painel" },
    { href: "/perfil", label: "Meu perfil" },
  ];
  if (type === "company") {
    items.push({ href: "/pilotos", label: "Encontre pilotos" });
  }
  return items;
}

/** Itens abaixo do bloco de esportes. */
export const NAV_BOTTOM: NavLink[] = [
  { href: "/rank", label: "Rank Sponsas" },
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/propostas", label: "Propostas" },
  { href: "/patrocinios", label: "Patrocínios" },
  { href: "/entregas", label: "Entregas" },
  { href: "/configuracoes", label: "Configurações" },
];
