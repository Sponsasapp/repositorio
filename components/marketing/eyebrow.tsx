const TONES = {
  primary: { border: "border-primary/30", text: "text-primary", dot: "bg-primary" },
  teal: { border: "border-success/30", text: "text-success", dot: "bg-success" },
  amber: {
    border: "border-amber-500/30",
    text: "text-amber-500",
    dot: "bg-amber-500",
  },
};

/** Pill de eyebrow — ponto + texto tracked em caixa alta, padrão CineLook. */
export function Eyebrow({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <span
      className={`${t.border} ${t.text} inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase`}
    >
      <span className={`${t.dot} size-1.5 rounded-full`} />
      {children}
    </span>
  );
}
