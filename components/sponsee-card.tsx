import Link from "next/link";
import { Avatar } from "@/components/avatar";

export function SponseeCard({
  id,
  urlPrefix,
  name,
  photo_url,
  line,
}: {
  id: string;
  urlPrefix: string;
  name: string;
  photo_url: string | null;
  line: string;
}) {
  return (
    <Link
      href={`/${urlPrefix}/${id}`}
      className="border-border border-l-primary bg-card hover:border-l-primary/60 flex items-center gap-3 rounded-lg border border-l-3 p-4 transition-colors"
    >
      <Avatar src={photo_url} name={name} className="size-11 shrink-0 text-sm" />
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        <p className="text-muted-foreground truncate text-sm">{line || "—"}</p>
      </div>
    </Link>
  );
}
