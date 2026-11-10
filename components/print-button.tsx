"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Abre o "imprimir" do navegador — dali dá pra salvar em PDF. */
export function PrintButton({ label = "Baixar PDF" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <PrinterIcon className="size-4" />
      {label}
    </Button>
  );
}
