"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Botão de submit que trava e mostra "Aguarde…" enquanto a server action roda.
 * `confirm` pede confirmação antes de enviar (ações irreversíveis).
 */
export function SubmitButton({
  children,
  pendingLabel = "Aguarde…",
  confirm: confirmText,
  onClick,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & {
  pendingLabel?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
