"use client";
import { LogoLink } from "@/components/logo-link";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/para-empresas", label: "Para empresas" },
  { href: "/para-pilotos", label: "Para pilotos" },
  { href: "/planos", label: "Planos" },
  { href: "/pilotos", label: "Ver pilotos" },
  { href: "/empresas", label: "Ver empresas" },
  { href: "/rank", label: "Rank" },
];

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="border-border relative border-b">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-5">
        <LogoLink className="text-xl" />

        <nav className="hidden gap-8 text-sm font-medium md:flex">
          {NAV.slice(0, 4).map((n) => (
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
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="hidden sm:inline-flex"
          >
            <Link href="/pilotos">Ver pilotos</Link>
          </Button>
          {isLoggedIn ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="hidden sm:inline-flex"
              >
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="lg" className="hidden sm:inline-flex">
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="text-foreground flex size-9 items-center justify-center rounded-md md:hidden"
          >
            <MenuIcon className="size-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="bg-background absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col p-5">
            <div className="mb-6 flex items-start justify-between">
              <LogoLink tagline className="text-xl" onNavigate={close} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={close}
                  className="text-foreground rounded-md px-2 py-2.5 text-sm"
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="mt-6 flex flex-col gap-2 border-t pt-6">
              {isLoggedIn ? (
                <Button asChild size="lg">
                  <Link href="/dashboard" onClick={close}>
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/cadastro" onClick={close}>
                      Criar conta
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login" onClick={close}>
                      Entrar
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
