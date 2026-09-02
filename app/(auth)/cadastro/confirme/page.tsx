import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirme seu e-mail — Sponsas" };

export default function ConfirmePage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl">Confirme seu e-mail</h1>
      <p className="text-muted-foreground text-sm">
        Enviamos um link de confirmação para o seu e-mail. Clique nele para
        ativar sua conta e entrar.
      </p>
      <p className="text-muted-foreground text-sm">
        Não recebeu? Verifique o spam ou{" "}
        <Link href="/cadastro" className="text-foreground underline">
          tente de novo
        </Link>
        .
      </p>
      <Link href="/login" className="text-foreground mt-2 text-sm underline">
        Ir para o login
      </Link>
    </div>
  );
}
