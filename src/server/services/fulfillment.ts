import "server-only";
import { PROMPT_VERSION } from "@/features/interpretation/prompts";
import type { ServiceClient } from "@/server/db/clients";
import { logEvent } from "@/server/logging";

export async function fulfillApprovedOrder(
  service: ServiceClient,
  input: {
    orderId: string;
    chartId: string;
    leadId: string;
    amountCents: number;
    currency: string;
    provider: string;
    providerPaymentId: string;
    analyticsName?: string;
    analyticsProperties?: Record<string, unknown>;
  },
) {
  await service.from("payments").upsert(
    {
      order_id: input.orderId,
      provider: input.provider,
      provider_payment_id: input.providerPaymentId,
      status: "approved",
      amount_cents: input.amountCents,
      currency: input.currency,
    },
    { onConflict: "provider,provider_payment_id" },
  );
  await service.from("orders").update({ status: "approved" }).eq("id", input.orderId);

  const existing = await service.from("entitlements").select("id").eq("order_id", input.orderId).maybeSingle();
  const entitlementId = existing.data
    ? String(existing.data.id)
    : await insertEntitlement(service, input);
  if (!entitlementId) return { entitlementId: null, granted: false as const };

  if (!existing.data) {
    const queued = await service.from("jobs").insert({
      kind: "interpretation",
      idempotency_key: `interpretation:${entitlementId}:${PROMPT_VERSION}`,
      status: "queued",
      payload: { entitlementId, chartId: input.chartId },
      next_run_at: new Date().toISOString(),
    });
    if (queued.error && queued.error.code !== "23505") {
      logEvent("error", "interpretation_enqueue_failed", { code: queued.error.code ?? "db" });
    }
    await service.from("analytics_events").insert({
      name: input.analyticsName ?? "payment_approved",
      order_id: input.orderId,
      chart_id: input.chartId,
      properties: input.analyticsProperties ?? {},
    });
  }

  return { entitlementId, granted: !existing.data };
}

async function insertEntitlement(
  service: ServiceClient,
  input: { orderId: string; chartId: string; leadId: string },
) {
  const granted = await service
    .from("entitlements")
    .insert({ order_id: input.orderId, chart_id: input.chartId, lead_id: input.leadId })
    .select("id")
    .maybeSingle();
  return granted.data ? String(granted.data.id) : null;
}
