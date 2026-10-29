import "server-only";
import { CARD_ART_BUCKET, isRemoteCardArtUrl } from "@/features/missions/card-art";
import { guessImageContentType, pdfImageDataUri } from "@/features/reading/pdf-images";
import type { ServiceClient } from "@/server/db/clients";

async function bytesFromRemote(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) return null;
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || guessImageContentType(url),
  };
}

async function bytesFromStorage(service: ServiceClient, path: string) {
  const file = await service.storage.from(CARD_ART_BUCKET).download(path);
  if (file.error || !file.data) return null;
  return {
    bytes: Buffer.from(await file.data.arrayBuffer()),
    contentType: file.data.type || guessImageContentType(path),
  };
}

export async function loadCardArtDataUris(service: ServiceClient, codeIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(codeIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const stored = await service.from("mission_codes").select("id,image_url").in("id", unique);
  const images: Record<string, string> = {};
  for (const row of stored.data ?? []) {
    const id = String(row.id);
    const imageUrl = typeof row.image_url === "string" ? row.image_url : null;
    if (!imageUrl) continue;
    try {
      const loaded = isRemoteCardArtUrl(imageUrl)
        ? imageUrl.startsWith("http")
          ? await bytesFromRemote(imageUrl)
          : null
        : await bytesFromStorage(service, imageUrl);
      if (!loaded) continue;
      const uri = pdfImageDataUri(loaded.bytes, loaded.contentType);
      if (uri) images[id] = uri;
    } catch {
      // Sem arte, a carta segue com o placeholder tipográfico.
    }
  }
  return images;
}
