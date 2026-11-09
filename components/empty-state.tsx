import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Estado vazio com próxima ação (em vez de só "nada aqui"). */
export function EmptyState({
  title,
  text,
  actions,
}: {
  title: string;
  text: string;
  actions: { label: string; href: string }[];
}) {
  return (
    <div className="border-border bg-card mt-8 rounded-xl border border-dashed px-6 py-10 text-center">
      <h2 className="text-xl">{title}</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{text}</p>
      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {actions.map((a, i) => (
            <Button key={a.href} asChild variant={i === 0 ? "default" : "outline"}>
              <Link href={a.href}>{a.label}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
