import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Barra fixa no rodapé das páginas de marketing — inspirada no padrão de
 * landing page do CineLook (badge + frase + CTAs sempre visíveis).
 */
export function StickyCta({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="bg-navy text-navy-foreground fixed inset-x-0 bottom-0 z-40 border-t border-white/10">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-primary/15 text-primary inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
            <span className="bg-primary size-1.5 rounded-full" />
            Sponsas
          </span>
          <span className="hidden text-white/70 sm:inline">
            Organize seu patrocínio{" "}
            <span className="text-primary font-semibold">hoje mesmo</span>.
          </span>
          <span className="text-white/70 sm:hidden">
            Comece a organizar seu patrocínio.
          </span>
        </div>
        <div className="flex gap-2">
          {isLoggedIn ? (
            <Button asChild size="sm" className="flex-1 sm:flex-none">
              <Link href="/dashboard">Ir pro Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10 hover:text-white sm:flex-none"
              >
                <Link href="/planos">Ver planos</Link>
              </Button>
              <Button asChild size="sm" className="flex-1 sm:flex-none">
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
