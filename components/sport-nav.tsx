"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORTS } from "@/lib/sports";

/**
 * Navegação por esporte → modalidade para a barra lateral (fundo navy).
 * A modalidade que casa com `?modalidade=` (em /pilotos ou /empresas) abre
 * sozinha e mostra os atalhos Pilotos / Empresas.
 */
export function SportNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeModality = searchParams.get("modalidade");
  const onListing = pathname === "/pilotos" || pathname === "/empresas";

  return (
    <div className="flex flex-col gap-1">
      {SPORTS.map((sport) => (
        <SportGroup
          key={sport.slug}
          sport={sport}
          activeModality={onListing ? activeModality : null}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SportGroup({
  sport,
  activeModality,
  pathname,
  onNavigate,
}: {
  sport: (typeof SPORTS)[number];
  activeModality: string | null;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-white/80 hover:text-white"
      >
        {open ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        {sport.label}
      </button>

      {open && (
        <div className="flex flex-col gap-0.5">
          {sport.modalities.map((m) => {
            const isActive = activeModality === m.value;
            return (
              <div key={m.slug}>
                <Link
                  href={`/pilotos?modalidade=${encodeURIComponent(m.value)}`}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-md py-1.5 pr-3 pl-8 text-sm transition-colors",
                    isActive
                      ? "font-medium text-white"
                      : "text-white/55 hover:text-white",
                  )}
                >
                  {m.label}
                </Link>
                {isActive && (
                  <div className="flex flex-col gap-0.5">
                    <SubLink
                      href={`/pilotos?modalidade=${encodeURIComponent(m.value)}`}
                      label="Pilotos"
                      active={pathname === "/pilotos"}
                      onNavigate={onNavigate}
                    />
                    <SubLink
                      href={`/empresas?modalidade=${encodeURIComponent(m.value)}`}
                      label="Empresas"
                      active={pathname === "/empresas"}
                      onNavigate={onNavigate}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block rounded-md py-1.5 pr-3 pl-[52px] text-[13px] transition-colors",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-white/50 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}
