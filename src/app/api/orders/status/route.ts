import { orderStatusByReference } from "@/server/services/checkout";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) return Response.json({ status: "unknown" });
  const status = await orderStatusByReference(ref);
  if (!status.configured) return Response.json({ status: "not_configured" });
  return Response.json({ status: status.status });
}
