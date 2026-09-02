import { Label } from "@/components/ui/label";
import { BR_UF } from "@/lib/br";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-primary bg-card rounded-lg border border-l-3 p-5">
      <h2 className="mb-4 text-xl">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export function UfSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <select
      id="state"
      name="state"
      defaultValue={defaultValue ?? ""}
      className="border-input h-9 w-full rounded-lg border bg-transparent px-2 text-sm"
    >
      <option value="">—</option>
      {BR_UF.map((uf) => (
        <option key={uf} value={uf}>
          {uf}
        </option>
      ))}
    </select>
  );
}
