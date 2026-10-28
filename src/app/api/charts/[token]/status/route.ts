import { consumeMemoryLimit, rateLimitKey } from "@/server/security/rate-limit";
import { loadChartByToken } from "@/server/services/charts";
import { loadReadingProgress } from "@/server/services/reading-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const limit = consumeMemoryLimit(rateLimitKey(request, "reading-status"), 40, 60_000);
  if (!limit.allowed) return Response.json({ ok: false }, { status: 429 });
  const loaded = await loadChartByToken(token);
  if (!loaded || loaded.entitlement !== "active" || !loaded.entitlementId) {
    return Response.json({ ok: false }, { status: 404 });
  }
  const progress = await loadReadingProgress(loaded.service, {
    chartId: loaded.chartId,
    entitlementId: loaded.entitlementId,
  });
  return Response.json({
    ok: true,
    ...progress.delivery,
  });
}
