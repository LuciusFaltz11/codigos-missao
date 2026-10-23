import { NextResponse } from "next/server";
import { CARD_ART_BUCKET, isRemoteCardArtUrl } from "@/features/missions/card-art";
import { tryServiceClient } from "@/server/db/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-z]{3,12}-[123]$/.test(id)) return new Response(null, { status: 404 });
  const service = tryServiceClient();
  if (!service) return new Response(null, { status: 503 });
  const stored = await service.from("mission_codes").select("image_url").eq("id", id).maybeSingle();
  const imageUrl = typeof stored.data?.image_url === "string" ? stored.data.image_url : null;
  if (!imageUrl) return new Response(null, { status: 404 });
  if (isRemoteCardArtUrl(imageUrl)) return NextResponse.redirect(imageUrl);
  const file = await service.storage.from(CARD_ART_BUCKET).download(imageUrl);
  if (file.error || !file.data) return new Response(null, { status: 404 });
  const bytes = await file.data.arrayBuffer();
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": file.data.type || "application/octet-stream",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
