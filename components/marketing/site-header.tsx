"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/para-empresas", label: "Para empresas" },
  { href: "/para-pilotos", label: "Para pilotos" },
  { href: "/planos", label: "Planos" },
];

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  return (
    <header className="border-border border-b">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl">
          Spon<span className="text-primary font-bold">sas</span>
        </Link>

        <nav className="hidden gap-8 text-sm font-medium md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                pathname === n.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="lg" className="hidden sm:inline-flex">
            <Link href="/pilotos">Ver pilotos</Link>
          </Button>
          {isLoggedIn ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Painel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="lg">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
