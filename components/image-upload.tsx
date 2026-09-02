"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUpload({
  name,
  initial,
  shape = "square",
  hint,
  onChange,
}: {
  name?: string;
  initial: string | null;
  shape?: "square" | "circle";
  hint?: string;
  onChange?: (url: string) => void;
}) {
  const [url, setUrlState] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setUrl = (u: string) => {
    setUrlState(u);
    onChange?.(u);
  };

  async function onFile(file: File) {
    setError(null);
    if (!OK_TYPES.includes(file.type)) {
      setError("Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("A imagem precisa ter até 3 MB.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessão expirada. Recarregue a página.");
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError("Falha no upload. Tente outra imagem.");
        return;
      }

      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      setUrl(data.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {name && <input type="hidden" name={name} value={url} />}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center overflow-hidden border",
          shape === "circle" ? "rounded-full" : "rounded-lg",
        )}
      >
        {busy ? (
          <Loader2Icon className="size-5 animate-spin" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-5" />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {url ? "Trocar" : "Enviar imagem"}
          </Button>
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setUrl("")}
            >
              Remover
            </Button>
          )}
        </div>
        {error ? (
          <p className="text-destructive text-xs">{error}</p>
        ) : (
          hint && <p className="text-muted-foreground text-xs">{hint}</p>
        )}
      </div>
    </div>
  );
}
