"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Observa todo `.reveal` da página e adiciona `.in` quando entra na tela
 * (IntersectionObserver), pra animar seção por seção durante o scroll — não
 * só uma vez no carregamento. Monta uma vez no layout raiz; reroda a cada
 * navegação do App Router (o DOM muda, mas o componente não desmonta).
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    for (const el of els) {
      // Já visível no viewport ao montar (ex.: topo da home) — revela sem
      // esperar um scroll que talvez nunca aconteça.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        el.classList.add("in");
      } else {
        io.observe(el);
      }
    }

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
