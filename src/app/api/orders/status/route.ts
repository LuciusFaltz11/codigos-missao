import { cookies } from "next/headers";
import { CHECKOUT_REF_COOKIE, pickLocalOrderReference } from "@/features/checkout/return-status";
import { loadOrderReturnView } from "@/server/services/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const slug = url.searchParams.get("slug");
  const cookieStore = await cookies();
  const localRef = pickLocalOrderReference(url.searchParams.get("local_ref"), cookieStore.get(CHECKOUT_REF_COOKIE)?.value);
  const headers = { "Cache-Control": "no-store" };
  if (!ref && !slug && !localRef) {
    return Response.json({ status: "unknown", readingUrl: null, amountCents: null, email: null }, { headers });
  }
  const view = await loadOrderReturnView({ ref, slug, localRef });
  if (!view.configured) {
    return Response.json({ status: "not_configured", readingUrl: null, amountCents: null, email: null }, { headers });
  }
  return Response.json(
    { status: view.status, readingUrl: view.readingUrl, amountCents: view.amountCents, email: view.email },
    { headers },
  );
}
