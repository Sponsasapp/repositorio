"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-navy text-navy-foreground hidden w-56 shrink-0 flex-col gap-1 p-5 md:flex">
      <Link href="/dashboard" className="mb-6 px-2 text-xl">
        Spon<span className="text-primary font-bold">sas</span>
      </Link>
      {NAV_LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-disabled={link.soon}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-white/10 font-semibold text-white"
                : "text-white/60 hover:text-white",
              link.soon && "pointer-events-none opacity-40",
            )}
          >
            {link.label}
            {link.soon && (
              <span className="ml-1 text-[10px] uppercase">em breve</span>
            )}
          </Link>
        );
      })}
    </aside>
  );
}
