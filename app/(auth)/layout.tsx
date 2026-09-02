import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-2xl">
        Spon<span className="text-primary font-bold">sas</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="text-muted-foreground mt-8 text-xs">
        Sponsorship made simple
      </p>
    </div>
  );
}
