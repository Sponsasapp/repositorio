import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center">
      <div className="mx-auto w-full max-w-[1120px] px-6 py-24">
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
            Setup inicial pronto. Próximo passo: autenticação.
          </p>
        </div>
      </div>
    </main>
  );
}
