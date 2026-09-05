/** Pill de eyebrow — ponto + texto tracked em caixa alta, padrão CineLook. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-primary/30 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">
      <span className="bg-primary size-1.5 rounded-full" />
      {children}
    </span>
  );
}
