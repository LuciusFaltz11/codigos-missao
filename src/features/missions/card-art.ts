export const CARD_ART_BUCKET = "card-art";
export const CARD_ART_MAX_BYTES = 4 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isRemoteCardArtUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

export function isStoredCardArtPath(value: string) {
  return !isRemoteCardArtUrl(value);
}

export function cardArtDisplayUrl(codeId: string, imageUrl: string | null, version?: string | number | null) {
  if (!imageUrl) return null;
  if (isRemoteCardArtUrl(imageUrl)) return imageUrl;
  const qs = version == null || version === "" ? "" : `?v=${encodeURIComponent(String(version))}`;
  return `/api/media/card-art/${encodeURIComponent(codeId)}${qs}`;
}

export function extensionForCardArtType(contentType: string) {
  return EXTENSION_BY_TYPE[contentType] ?? null;
}

export async function readCardArtUpload(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return { ok: true as const, empty: true as const };
  const ext = extensionForCardArtType(file.type);
  if (!ext) return { ok: false as const, reason: "type" as const };
  if (file.size > CARD_ART_MAX_BYTES) return { ok: false as const, reason: "size" as const };
  return {
    ok: true as const,
    empty: false as const,
    bytes: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
    ext,
  };
}
