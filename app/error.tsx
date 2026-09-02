"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-primary font-[family-name:var(--font-heading)] text-5xl">
        Ops
      </p>
      <h1 className="mt-2 text-2xl">Algo deu errado</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        Tivemos um problema ao carregar esta página. Tente de novo.
      </p>
      {error.digest && (
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          Código: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button size="lg" onClick={reset}>
          Tentar de novo
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="/">Ir para a home</a>
        </Button>
      </div>
    </main>
  );
}
