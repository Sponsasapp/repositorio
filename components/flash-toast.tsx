"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Lê `?ok=` / `?erro=` (ver lib/flash.ts), mostra o toast e limpa a URL. */
export function FlashToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const ok = params.get("ok");
    const erro = params.get("erro");
    if (!ok && !erro) return;

    if (erro) toast.error(erro);
    else if (ok) toast.success(ok);

    const rest = new URLSearchParams(params);
    rest.delete("ok");
    rest.delete("erro");
    const qs = rest.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return null;
}
