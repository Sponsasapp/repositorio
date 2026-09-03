import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirme seu e-mail — Sponsas" };

export default async function ConfirmePage({
  searchParams,
}: {
  searchParams: Promise<{ pro?: string; cupom?: string; d?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="flex flex-col gap-3">
      {sp.pro && (
        <p className="border-success/30 bg-success-soft text-success rounded-md border-l-2 px-3 py-2 text-sm">
          Cupom aplicado — seu plano PRO fica ativo por {sp.pro}{" "}
          {Number(sp.pro) === 1 ? "mês" : "meses"} assim que você confirmar o
          e-mail.
        </p>
      )}
      {sp.cupom === "invalido" && (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border-l-2 px-3 py-2 text-sm">
          O cupom não foi aplicado (inválido, expirado ou já usado). Sua conta
          foi criada no plano Free.
        </p>
      )}
      {sp.cupom === "config" && (
        <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border-l-2 px-3 py-2 text-sm">
          Não conseguimos processar o cupom agora (erro de configuração). Sua
          conta foi criada no plano Free — fale com o suporte para ativar o PRO.
          {sp.d && (
            <span className="mt-1 block font-mono text-[11px] opacity-70">
              {sp.d}
            </span>
          )}
        </p>
      )}
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
