import { redirect } from "next/navigation";
import { consumeMemoryLimit, rateLimitKey } from "@/server/security/rate-limit";
import { loadChartByToken } from "@/server/services/charts";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const limit = consumeMemoryLimit(rateLimitKey(request, "email-resend"), 3, 60 * 60_000);
  if (!limit.allowed) redirect(`/mapa/completo/${token}?email=limit`);
  const loaded = await loadChartByToken(token);
  if (!loaded || !loaded.entitlementId) redirect(`/mapa/resultado/${token}`);
  const report = await loaded.service.from("reports").select("id").eq("chart_id", loaded.chartId).eq("status", "ready").limit(1).maybeSingle();
  if (!report.data) redirect(`/mapa/completo/${token}?email=pending`);
  await loaded.service.from("jobs").insert({
    kind: "email",
    idempotency_key: `email-resend:${report.data.id}:${Date.now()}`,
    status: "queued",
    payload: { reportId: report.data.id, chartId: loaded.chartId },
    next_run_at: new Date().toISOString(),
  });
  redirect(`/mapa/completo/${token}?email=queued`);
}
