"use client";

import { useState } from "react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Foto de perfil com fallback para as iniciais quando a imagem falha, é um
 * arquivo quebrado ou é um placeholder 1×1 (o bucket tem uploads antigos assim).
 */
export function Avatar({
  src,
  name,
  className,
  rounded = "full",
  tone = "navy",
}: {
  src: string | null | undefined;
  name: string;
  className?: string;
  rounded?: "full" | "lg" | "xl";
  tone?: "navy" | "primary";
}) {
  const [broken, setBroken] = useState(false);
  const show = src && !broken;

  const check = (img: HTMLImageElement | null) => {
    if (!img || !img.complete) return;
    if (
      img.naturalWidth <= 2 ||
      img.naturalHeight <= 2 ||
      img.naturalWidth === 0
    ) {
      setBroken(true);
    }
  };

  return (
    <span
      className={cn(
        "flex items-center justify-center overflow-hidden",
        tone === "navy"
          ? "bg-navy text-navy-foreground"
          : "bg-primary text-primary-foreground",
        rounded === "full" && "rounded-full",
        rounded === "lg" && "rounded-lg",
        rounded === "xl" && "rounded-xl",
        className,
      )}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={check}
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setBroken(true)}
          onLoad={(e) => check(e.currentTarget)}
        />
      ) : (
        <span className="font-[family-name:var(--font-heading)]">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
