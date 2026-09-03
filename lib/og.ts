import "server-only";

/**
 * Baixa uma imagem e devolve um data URI para usar dentro do `ImageResponse`
 * (Satori). Retorna null se a URL falhar, não for imagem, ou for um arquivo
 * quebrado (o bucket tem placeholders de ~70 bytes de uploads antigos).
 */
export async function toDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 512) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
