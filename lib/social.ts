/**
 * Normaliza o que o usuário digita no campo de rede social / site:
 * "@perfil", "instagram.com/perfil" ou URL completa → URL https.
 * Qualquer coisa que não vire http(s) (ex.: "javascript:") vira null.
 */
const HANDLE_BASE: Record<string, (h: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
};

export function normalizeUrl(
  input: string | null | undefined,
  platform?: string,
): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // "@perfil" (ou "perfil" sem ponto) quando sabemos a plataforma
  const toUrl = platform ? HANDLE_BASE[platform] : undefined;
  const handle = raw.replace(/^@/, "");
  if (
    toUrl &&
    /^[\w.\-]+$/.test(handle) &&
    (raw.startsWith("@") || !handle.includes("."))
  ) {
    return toUrl(handle);
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
