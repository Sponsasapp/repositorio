import type { ProfileType } from "@/lib/types/database.types";

export type ParticipantMeta = {
  /** Rótulo no singular ("Piloto"). */
  label: string;
  /** Plural ("Pilotos"). */
  labelPlural: string;
  /** Prefixo da rota do perfil público (/p/[id], /pista/[id]…). */
  urlSingular: string;
  /** Rota da listagem (/pilotos, /pistas…). */
  urlList: string;
  /** Frase curta pra CTA de cadastro. */
  hint: string;
  /** É patrocinador (empresa) ou busca patrocínio. */
  isSponsor: boolean;
};

export const PARTICIPANT: Record<ProfileType, ParticipantMeta> = {
  athlete: {
    label: "Piloto",
    labelPlural: "Pilotos",
    urlSingular: "p",
    urlList: "pilotos",
    hint: "Busco patrocínio",
    isSponsor: false,
  },
  company: {
    label: "Empresa",
    labelPlural: "Empresas",
    urlSingular: "e",
    urlList: "empresas",
    hint: "Quero patrocinar",
    isSponsor: true,
  },
  track: {
    label: "Pista",
    labelPlural: "Pistas",
    urlSingular: "pista",
    urlList: "pistas",
    hint: "Pista / autódromo buscando patrocínio",
    isSponsor: false,
  },
  event: {
    label: "Evento",
    labelPlural: "Eventos",
    urlSingular: "evento",
    urlList: "eventos",
    hint: "Organizo eventos e busco patrocínio",
    isSponsor: false,
  },
  media: {
    label: "Mídia",
    labelPlural: "Mídias",
    urlSingular: "m",
    urlList: "midias",
    hint: "Foto, vídeo ou influência no esporte",
    isSponsor: false,
  },
};

export const PROFILE_TYPES = Object.keys(PARTICIPANT) as ProfileType[];

/** Tipos que buscam patrocínio (tudo menos empresa). */
export const SPONSEE_TYPES = PROFILE_TYPES.filter(
  (t) => !PARTICIPANT[t].isSponsor,
);

/** Caminho do perfil público de um perfil. */
export function publicPath(type: ProfileType, id: string): string {
  return `/${PARTICIPANT[type].urlSingular}/${id}`;
}

/** Um pode mandar proposta pro outro? (empresa ↔ patrocinado) */
export function canPropose(a: ProfileType, b: ProfileType): boolean {
  return PARTICIPANT[a].isSponsor !== PARTICIPANT[b].isSponsor;
}
