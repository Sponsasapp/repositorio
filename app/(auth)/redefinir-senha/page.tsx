import type { Metadata } from "next";
import { RedefinirForm } from "./redefinir-form";

export const metadata: Metadata = { title: "Nova senha — Sponsas" };

export default function RedefinirSenhaPage() {
  return <RedefinirForm />;
}
