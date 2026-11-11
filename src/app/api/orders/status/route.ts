import { loadOrderReturnView } from "@/server/services/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const slug = url.searchParams.get("slug");
  const headers = { "Cache-Control": "no-store" };
  if (!ref && !slug) return Response.json({ status: "unknown", readingUrl: null }, { headers });
  const view = await loadOrderReturnView({ ref, slug });
  if (!view.configured) return Response.json({ status: "not_configured", readingUrl: null }, { headers });
  return Response.json({ status: view.status, readingUrl: view.readingUrl }, { headers });
}
