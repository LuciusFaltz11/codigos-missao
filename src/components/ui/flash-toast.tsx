"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FLASH_PARAM_KEYS, resolveFlash, type Flash } from "@/lib/flash";

function flashId(flash: Flash) {
  return `flash:${flash.kind}:${flash.message}`;
}

function showFlash(flash: Flash) {
  const id = flashId(flash);
  if (flash.kind === "success") toast.success(flash.message, { id });
  else toast.error(flash.message, { id });
}

export function FlashToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const flash = resolveFlash(pathname, searchParams);
    if (!flash) return;
    showFlash(flash);

    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const param of FLASH_PARAM_KEYS) {
      if (next.has(param)) {
        next.delete(param);
        changed = true;
      }
    }
    if (!changed) return;
    const query = next.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

export function ImmediateFlash({ flash }: { flash: Flash | null }) {
  const kind = flash?.kind ?? null;
  const message = flash?.message ?? null;

  useEffect(() => {
    if (!kind || !message) return;
    showFlash({ kind, message });
  }, [kind, message]);

  return null;
}
