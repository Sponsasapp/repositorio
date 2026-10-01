"use client";

import { useEffect, useRef } from "react";

/**
 * Spotlight que segue o cursor dentro do elemento pai mais próximo com
 * posicionamento relativo (ex.: .hero-atmosphere). Só escreve variáveis CSS
 * — todo o visual é feito em `.spotlight` no globals.css, e só aparece em
 * dispositivos com hover de verdade (ver media query lá).
 */
export function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    parent.addEventListener("mousemove", onMove);
    return () => parent.removeEventListener("mousemove", onMove);
  }, []);

  return <div ref={ref} className="spotlight" aria-hidden="true" />;
}
