"use client";

import { useEffect, useState } from "react";
import { InputShell } from "@/components/ui/input";

export function CodeArtField({
  currentSrc,
  archetype,
}: {
  currentSrc: string | null;
  archetype: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const src = preview ?? currentSrc;

  return (
    <fieldset className="rounded-2xl border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold">Arte da carta</legend>
      <div className="flex flex-wrap items-center gap-4">
        <div className="size-24 overflow-hidden rounded-xl border border-border bg-gold-soft">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={`Arte de ${archetype}`} className="h-full w-full object-cover" />
          ) : (
            <p className="grid h-full place-items-center px-2 text-center text-xs text-muted">Sem arte</p>
          )}
        </div>
        <div className="grid min-w-48 flex-1 gap-2">
          <label className="grid gap-1 text-sm">
            Enviar imagem
            <InputShell className="px-3 py-2">
              <input
                className="input-shell-field px-0 py-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-wine file:px-3 file:py-2 file:text-white"
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setPreview((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return file ? URL.createObjectURL(file) : null;
                  });
                }}
              />
            </InputShell>
          </label>
          {currentSrc ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input name="removeImage" type="checkbox" />
              Remover arte atual
            </label>
          ) : null}
          <p className="text-xs text-muted">PNG, JPG ou WebP, até 4 MB. O arquivo substitui o link externo.</p>
        </div>
      </div>
    </fieldset>
  );
}
