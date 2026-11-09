import { redirect } from "next/navigation";

/**
 * Feedback de server action sem estado: redireciona de volta com `?ok=` ou
 * `?erro=` e o <FlashToast /> (root layout) mostra o aviso e limpa a URL.
 * Só pra mensagens curtas e sem dado pessoal (vai na URL).
 */
export function flash(path: string, kind: "ok" | "erro", msg: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}
