import Link from "next/link";
import { CheckIcon } from "lucide-react";

export type ChecklistItem = {
  label: string;
  /** Por que importa, em uma linha (aparece só nos itens pendentes). */
  hint: string;
  href: string;
  done: boolean;
};

/**
 * "Perfil pronto pra patrocínio": passos do onboarding com barra de progresso.
 * Some sozinho quando tudo está feito.
 */
export function OnboardingChecklist({
  title,
  items,
}: {
  title: string;
  items: ChecklistItem[];
}) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  const pct = Math.round((done / items.length) * 100);
  const next = items.find((i) => !i.done);

  return (
    <section className="border-primary bg-card rounded-xl border border-l-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-muted-foreground text-sm">
          {done} de {items.length} · {pct}%
        </span>
      </div>
      <span className="bg-muted mt-3 block h-2 overflow-hidden rounded-full">
        <span
          className="bg-primary block h-full rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={
                item.done
                  ? "text-muted-foreground flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm"
                  : "hover:bg-muted/60 flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors"
              }
            >
              <span
                className={
                  item.done
                    ? "bg-success mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                    : "border-border mt-0.5 size-5 shrink-0 rounded-full border-2"
                }
                aria-hidden
              >
                {item.done && <CheckIcon className="size-3.5" strokeWidth={3} />}
              </span>
              <span>
                <span className={item.done ? "line-through" : "font-medium"}>
                  {item.label}
                </span>
                {!item.done && (
                  <span className="text-muted-foreground block text-xs">
                    {item.hint}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {next && (
        <Link
          href={next.href}
          className="bg-primary text-primary-foreground mt-4 inline-flex rounded-md px-4 py-2 text-sm font-semibold"
        >
          Próximo passo: {next.label.toLowerCase()}
        </Link>
      )}
    </section>
  );
}
