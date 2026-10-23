import "server-only";
import { InterpretationResultSchema } from "@/features/interpretation/validate";
import { loadChartByToken } from "@/server/services/charts";

export async function loadPaidReading(token: string) {
  const loaded = await loadChartByToken(token);
  if (!loaded || loaded.entitlement !== "active" || !loaded.entitlementId) {
    return { state: "locked" as const };
  }
  const reading = await loaded.service
    .from("readings")
    .select("status,result")
    .eq("entitlement_id", loaded.entitlementId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!reading.data || reading.data.status !== "completed") {
    return {
      state: "processing" as const,
      status: String(reading.data?.status ?? "queued"),
      activations: loaded.activations,
    };
  }
  const parsed = InterpretationResultSchema.safeParse(reading.data.result);
  if (!parsed.success) return { state: "processing" as const, status: "failed_validation", activations: loaded.activations };
  return { state: "ready" as const, reading: parsed.data, activations: loaded.activations };
}
