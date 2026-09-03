import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Criar conta — Sponsas" };

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const defaultType = tipo === "empresa" ? "company" : "athlete";
  return <AuthForm mode="signup" defaultType={defaultType} />;
}
