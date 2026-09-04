"use client";
import { LogoLink } from "@/components/logo-link";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/actions";
import { navTop, NAV_BOTTOM } from "./nav-links";
import { SportNav } from "@/components/sport-nav";
import type { ProfileType } from "@/lib/types/database.types";

function NavRow({
  href,
  label,
  pathname,
  onClick,
}: {
  href: string;
  label: string;
  pathname: string;
  onClick: () => void;
}) {
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2.5 text-sm",
        active
          ? "bg-white/10 font-semibold text-white"
          : "text-white/70 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

export function MobileNav({
  email,
  profileType,
}: {
  email?: string;
  profileType: ProfileType;
}) {
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
              <LogoLink tagline className="text-xl" onNavigate={close} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="flex size-8 items-center justify-center rounded-md text-white/70 hover:text-white"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto">
              {navTop(profileType).map((link) => (
                <NavRow
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  pathname={pathname}
                  onClick={close}
                />
              ))}
              <div className="my-2 border-t border-white/10" />
              <SportNav onNavigate={close} />
              <div className="my-2 border-t border-white/10" />
              {NAV_BOTTOM.map((link) => (
                <NavRow
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  pathname={pathname}
                  onClick={close}
                />
              ))}
            </div>

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
