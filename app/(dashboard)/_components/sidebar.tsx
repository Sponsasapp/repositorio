"use client";
import { Logo } from "@/components/logo";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navTop, NAV_BOTTOM, type NavLink as NavLinkType } from "./nav-links";
import { SportNav } from "@/components/sport-nav";
import type { ProfileType } from "@/lib/types/database.types";

function NavItem({ link, pathname }: { link: NavLinkType; pathname: string }) {
  const active =
    pathname === link.href || pathname.startsWith(link.href + "/");
  return (
    <Link
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
}

export function Sidebar({ profileType }: { profileType: ProfileType }) {
  const pathname = usePathname();

  return (
    <aside className="bg-navy text-navy-foreground border-border hidden w-56 shrink-0 flex-col gap-1 border-r p-5 md:flex">
      <Link href="/dashboard" className="mb-6 px-2 text-xl">
        <Logo tagline />
      </Link>
      {navTop(profileType).map((link) => (
        <NavItem key={link.href} link={link} pathname={pathname} />
      ))}
      <div className="my-2 border-t border-white/10" />
      <SportNav />
      <div className="my-2 border-t border-white/10" />
      {NAV_BOTTOM.map((link) => (
        <NavItem key={link.href} link={link} pathname={pathname} />
      ))}
    </aside>
  );
}
