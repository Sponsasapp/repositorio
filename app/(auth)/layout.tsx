import { Logo } from "@/components/logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 items-center text-2xl">
        <Logo tagline />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
