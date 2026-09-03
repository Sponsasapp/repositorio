"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORTS, type Sport } from "@/lib/sports";

/**
 * Menu "Esportes" da barra lateral (fundo navy).
 * Só Automobilismo abre em modalidades; a modalidade ativa (via ?modalidade=)
 * revela os atalhos Pilotos / Empresas. Os outros esportes aparecem como
 * "em breve" até ganharem suas seções.
 */
export function SportNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onListing = pathname === "/pilotos" || pathname === "/empresas";
  const activeModality = onListing ? searchParams.get("modalidade") : null;

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
        Esportes
      </button>

      {open && (
        <div className="flex flex-col gap-0.5">
          {SPORTS.map((sport) =>
            sport.available ? (
              <SportGroup
                key={sport.slug}
                sport={sport}
                activeModality={activeModality}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ) : (
              <Link
                key={sport.slug}
                href={`/esportes/${sport.slug}`}
                onClick={onNavigate}
                className="flex items-center gap-1.5 rounded-md py-1.5 pr-3 pl-8 text-sm text-white/40 hover:text-white/70"
              >
                <span className="truncate">{sport.label}</span>
                <span className="ml-auto shrink-0 text-[9px] uppercase">
                  em breve
                </span>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SportGroup({
  sport,
  activeModality,
  pathname,
  onNavigate,
}: {
  sport: Sport;
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
        className="flex w-full items-center gap-1 rounded-md py-1.5 pr-3 pl-6 text-sm font-medium text-white/70 hover:text-white"
      >
        {open ? (
          <ChevronDownIcon className="size-3" />
        ) : (
          <ChevronRightIcon className="size-3" />
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
                    "block rounded-md py-1.5 pr-3 pl-11 text-sm transition-colors",
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
        "block rounded-md py-1.5 pr-3 pl-[60px] text-[13px] transition-colors",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-white/50 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}
