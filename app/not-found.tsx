import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-primary font-[family-name:var(--font-heading)] text-6xl">
        404
      </p>
      <h1 className="mt-2 text-2xl">Página não encontrada</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        O endereço não existe ou o conteúdo foi removido.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild size="lg">
          <Link href="/">Voltar para a home</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pilotos">Ver pilotos</Link>
        </Button>
      </div>
    </main>
  );
}
