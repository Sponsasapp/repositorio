import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Entrar — Sponsas" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string; redefinida?: string }>;
}) {
  const { next, erro, redefinida } = await searchParams;

  const notice =
    redefinida === "1"
      ? "Senha redefinida. Entre com a nova senha."
      : erro === "confirmacao"
        ? "Não foi possível confirmar. O link pode ter expirado — tente entrar ou peça um novo."
        : undefined;

  return <AuthForm mode="login" next={next} notice={notice} />;
}
