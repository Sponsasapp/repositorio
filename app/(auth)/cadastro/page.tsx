import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";
import type { ProfileType } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Criar conta — Sponsas" };

const TIPO_MAP: Record<string, ProfileType> = {
  piloto: "athlete",
  empresa: "company",
  pista: "track",
  evento: "event",
  midia: "media",
};

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const defaultType = TIPO_MAP[tipo ?? ""] ?? "athlete";
  return <AuthForm mode="signup" defaultType={defaultType} />;
}
