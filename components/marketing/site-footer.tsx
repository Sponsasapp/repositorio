import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="text-muted-foreground mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 py-10 text-[13px]">
        <span>© {new Date().getFullYear()} Sponsas — Sponsorship made simple</span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/como-funciona" className="hover:text-foreground">
            Como funciona
          </Link>
          <Link href="/planos" className="hover:text-foreground">
            Planos
          </Link>
          <Link href="/pilotos" className="hover:text-foreground">
            Pilotos
          </Link>
          <Link href="/termos" className="hover:text-foreground">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-foreground">
            Privacidade
          </Link>
        </div>
        <span>Português (BR)</span>
      </div>
    </footer>
  );
}
