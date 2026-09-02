import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Link enviado — Sponsas" };

export default function EnviadoPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl">Verifique seu e-mail</h1>
      <p className="text-muted-foreground text-sm">
        Se existir uma conta com esse e-mail, você vai receber um link para
        redefinir a senha. O link vale por 1 hora.
      </p>
      <p className="text-muted-foreground text-sm">
        Não recebeu? Confira o spam ou{" "}
        <Link href="/recuperar-senha" className="text-foreground underline">
          tente de novo
        </Link>
        .
      </p>
      <Link href="/login" className="text-foreground mt-2 text-sm underline">
        Voltar para o login
      </Link>
    </div>
  );
}
