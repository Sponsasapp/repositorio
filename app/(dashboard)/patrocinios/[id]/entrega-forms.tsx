"use client";

import { useActionState, useState } from "react";
import {
  adicionarEntrega,
  enviarComprovacao,
  type EntregaState,
} from "../actions";
import { OFFERED_DELIVERABLES } from "@/lib/deliverables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";

export function AddDeliverableForm({
  sponsorshipId,
}: {
  sponsorshipId: string;
}) {
  const [state, formAction, pending] = useActionState<EntregaState, FormData>(
    adicionarEntrega,
    undefined,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border text-muted-foreground hover:text-foreground self-start rounded-md border border-dashed px-3 py-1.5 text-sm"
      >
        + Adicionar entrega
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="border-border flex flex-col gap-3 rounded-lg border p-4"
    >
      <input type="hidden" name="sponsorship_id" value={sponsorshipId} />
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Tipo</Label>
          <select
            id="type"
            name="type"
            defaultValue=""
            required
            className="border-input h-9 rounded-lg border bg-transparent px-2 text-sm"
          >
            <option value="" disabled>
              Escolher…
            </option>
            {OFFERED_DELIVERABLES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due_date">Prazo</Label>
          <Input id="due_date" name="due_date" type="date" className="max-w-44" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          placeholder="Ex: Story marcando o perfil da marca no dia da corrida"
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Adicionar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function ProofForm({
  deliverableId,
  sponsorshipId,
}: {
  deliverableId: string;
  sponsorshipId: string;
}) {
  const [state, formAction, pending] = useActionState<EntregaState, FormData>(
    enviarComprovacao,
    undefined,
  );
  const [kind, setKind] = useState("link");
  const [url, setUrl] = useState("");

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="deliverable_id" value={deliverableId} />
      <input type="hidden" name="sponsorship_id" value={sponsorshipId} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="kind"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setUrl("");
          }}
          className="border-input h-8 rounded-lg border bg-transparent px-2 text-xs"
        >
          <option value="link">Link</option>
          <option value="screenshot">Print</option>
          <option value="video">Vídeo</option>
        </select>
        {kind === "screenshot" ? (
          <ImageUpload
            name="url"
            initial={null}
            folder="proofs"
            hint="JPG, PNG ou WebP até 3 MB"
            onChange={setUrl}
          />
        ) : (
          <Input
            name="url"
            type="url"
            placeholder="https://instagram.com/p/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-8 min-w-56 flex-1 text-xs"
          />
        )}
        <Button type="submit" size="xs" disabled={pending || !url}>
          {pending ? "Enviando…" : "Enviar comprovação"}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-destructive text-xs">
          {state.error}
        </p>
      )}
    </form>
  );
}
