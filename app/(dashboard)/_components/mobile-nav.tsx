"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/actions";
import { NAV_LINKS } from "./nav-links";

export function MobileNav({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // Trava o scroll do body enquanto aberto + fecha no Esc.
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="text-foreground -ml-1 flex size-9 items-center justify-center rounded-md md:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="bg-navy text-navy-foreground absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col gap-1 p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xl">
                Spon<span className="text-primary font-bold">sas</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="flex size-8 items-center justify-center rounded-md text-white/70 hover:text-white"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm",
                    active
                      ? "bg-white/10 font-semibold text-white"
                      : "text-white/70 hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-auto border-t border-white/10 pt-4">
              {email && (
                <p className="mb-2 px-3 text-xs text-white/50">{email}</p>
              )}
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-2 text-sm text-white/70 hover:text-white"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
