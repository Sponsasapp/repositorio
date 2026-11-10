"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SponseePackage } from "@/lib/types/database.types";

type Row = {
  key: string;
  id?: string;
  title: string;
  description: string;
  price: string;
  quantity: string;
};

let seq = 0;
const newKey = () => `n${++seq}`;

/**
 * Cotas de patrocínio (pista/evento/mídia). Lista repetível serializada em
 * JSON no hidden `packages` — o servidor faz upsert por id e apaga as
 * removidas (migration 0041).
 */
export function PackagesEditor({
  initial,
  examples,
}: {
  initial: SponseePackage[];
  /** Placeholder do nome (ex.: "Cota Ouro", "Placa no muro"). */
  examples: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((p) => ({
      key: p.id,
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      price: p.price != null ? String(p.price) : "",
      quantity: p.quantity != null ? String(p.quantity) : "",
    })),
  );

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload = rows
    .filter((r) => r.title.trim())
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      price: r.price,
      quantity: r.quantity,
    }));

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="packages" value={JSON.stringify(payload)} />

      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma cota ainda. Marcas preferem escolher um pacote pronto, com
          preço e o que está incluso.
        </p>
      )}

      {rows.map((r) => (
        <div
          key={r.key}
          className="border-border flex flex-col gap-2 rounded-lg border p-3"
        >
          <div className="flex gap-2">
            <Input
              value={r.title}
              onChange={(e) => update(r.key, { title: e.target.value })}
              placeholder={examples}
              aria-label="Nome da cota"
            />
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              className="text-muted-foreground hover:text-destructive shrink-0 px-2"
              aria-label="Remover cota"
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>
          <Textarea
            value={r.description}
            onChange={(e) => update(r.key, { description: e.target.value })}
            placeholder="O que está incluso (ex.: logo no arco de largada + 2 posts + estande 3x3)"
            rows={2}
            aria-label="O que está incluso"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={r.price}
              onChange={(e) => update(r.key, { price: e.target.value })}
              inputMode="numeric"
              placeholder="Preço R$ (vazio = sob consulta)"
              aria-label="Preço"
            />
            <Input
              value={r.quantity}
              onChange={(e) => update(r.key, { quantity: e.target.value })}
              inputMode="numeric"
              placeholder="Vagas (vazio = sem limite)"
              aria-label="Quantidade de vagas"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setRows((rs) => [
            ...rs,
            { key: newKey(), title: "", description: "", price: "", quantity: "" },
          ])
        }
        className="border-border text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-sm"
      >
        <PlusIcon className="size-4" />
        Adicionar cota
      </button>
    </div>
  );
}
