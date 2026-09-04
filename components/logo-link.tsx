"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

/**
 * Logo como link pra home em qualquer canto do site. Se já está na home,
 * clicar não navega — só atualiza a página (o usuário esperava "recarregar",
 * não ficar parado sem feedback nenhum).
 */
export function LogoLink({
  tagline,
  className,
  onNavigate,
}: {
  tagline?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    onNavigate?.();
    if (pathname === "/") {
      e.preventDefault();
      router.refresh();
    }
  }

  return (
    <Link href="/" onClick={handleClick} className={className}>
      <Logo tagline={tagline} />
    </Link>
  );
}
