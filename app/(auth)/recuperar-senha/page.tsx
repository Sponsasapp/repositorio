import type { Metadata } from "next";
import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = { title: "Recuperar senha — Sponsas" };

export default function RecuperarSenhaPage() {
  return <RecuperarForm />;
}
