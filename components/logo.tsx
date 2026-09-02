import { cn } from "@/lib/utils";

/**
 * Wordmark da Sponsas. "SPONS" + "AS" em cores diferentes — reforça a
 * ideia "Sponsor As Simple". Opcionalmente com a tagline embaixo.
 * Renderiza só o texto; o wrapper (Link/span) fica com quem usa.
 */
export function Logo({
  className,
  tagline = false,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="font-semibold tracking-tight">
        <span className="text-foreground">Spons</span>
        <span className="text-primary">as</span>
      </span>
      {tagline && (
        <span className="text-muted-foreground mt-1 text-[10px] font-normal tracking-wide">
          sponsorship made simple
        </span>
      )}
    </span>
  );
}
