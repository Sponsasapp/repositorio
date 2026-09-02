import type { Metadata } from "next";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Criar conta — Sponsas" };

export default function CadastroPage() {
  return <AuthForm mode="signup" />;
}
