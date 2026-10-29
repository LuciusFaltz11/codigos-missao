export function guessImageContentType(pathOrType: string) {
  const value = pathOrType.toLowerCase();
  if (value.includes("png") || value.endsWith(".png")) return "image/png";
  if (value.includes("jpeg") || value.includes("jpg") || value.endsWith(".jpg") || value.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (value.includes("webp") || value.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export function isPdfEmbeddableImage(contentType: string) {
  const type = contentType.toLowerCase();
  return type.includes("png") || type.includes("jpeg") || type.includes("jpg");
}

export function pdfImageDataUri(bytes: Buffer | Uint8Array, contentType: string): string | null {
  if (!bytes.byteLength || !isPdfEmbeddableImage(contentType)) return null;
  const mime = contentType.toLowerCase().includes("png") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}
