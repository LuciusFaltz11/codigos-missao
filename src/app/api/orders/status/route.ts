import { loadOrderReturnView } from "@/server/services/checkout";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const slug = url.searchParams.get("slug");
  if (!ref && !slug) return Response.json({ status: "unknown", readingUrl: null });
  const view = await loadOrderReturnView({ ref, slug });
  if (!view.configured) return Response.json({ status: "not_configured", readingUrl: null });
  return Response.json({ status: view.status, readingUrl: view.readingUrl });
}
