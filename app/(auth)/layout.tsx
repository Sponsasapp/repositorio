import { LogoLink } from "@/components/logo-link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <LogoLink tagline className="mb-8 items-center text-2xl" />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
