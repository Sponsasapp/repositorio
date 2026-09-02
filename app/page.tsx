import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-6">
        <span className="text-xl">
          Spon<span className="text-primary font-bold">sas</span>
        </span>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="lg">
            <Link href="/pilotos">Ver pilotos</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/cadastro">Criar conta</Link>
          </Button>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 items-center px-6 py-20">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Spon<span className="text-primary">sas</span> — Sponsorship made simple
          </p>
          <h1 className="text-6xl leading-[0.98] tracking-tight">
            Patrocínio sem
            <br />
            mensagem no escuro.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Pilotos organizam seu perfil comercial e suas entregas. Marcas
            encontram quem combina com elas e acompanham cada patrocínio num só
            lugar.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link href="/cadastro">Criar perfil de piloto</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/cadastro">Sou uma empresa</Link>
            </Button>
          </div>
          <p className="mt-16 text-sm text-muted-foreground">
            Em construção · autenticação no ar. Próximo: perfis.
          </p>
        </div>
      </div>
    </main>
  );
}
