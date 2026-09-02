/**
 * Converte texto digitado (pt-BR) em número.
 * "1.200" -> 1200 · "8,9" -> 8.9 · "8.9" -> 8.9 · "1.234,56" -> 1234.56
 * Retorna null se vazio ou inválido. Não aceita negativos.
 */
export function parseNumberBR(input: unknown): number | null {
  let s = String(input ?? "").trim().replace(/\s/g, "");
  if (!s) return null;

  if (s.includes(",")) {
    // formato BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234.567" — pontos são separador de milhar
    s = s.replace(/\./g, "");
  }
  // caso contrário, um ponto isolado é ponto decimal ("8.9")

  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
