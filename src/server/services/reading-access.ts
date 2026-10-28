import "server-only";
import { InterpretationResultSchema, type InterpretationResult } from "@/features/interpretation/validate";
import { resolveReadingDelivery, type ReadingDeliveryState } from "@/features/reading/delivery";
import type { ServiceClient } from "@/server/db/clients";
import { loadChartByToken } from "@/server/services/charts";

export type ReadingProgress = {
  delivery: ReadingDeliveryState;
  lastError: string | null;
  interpretation: InterpretationResult | null;
};

export async function loadReadingProgress(
  service: ServiceClient,
  input: { chartId: string; entitlementId: string },
): Promise<ReadingProgress> {
  const reading = await service
    .from("readings")
    .select("status,result,last_error")
    .eq("entitlement_id", input.entitlementId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const report = await service
    .from("reports")
    .select("status,storage_path")
    .eq("chart_id", input.chartId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsed = InterpretationResultSchema.safeParse(reading.data?.result);
  const interpretationValid = reading.data?.status === "completed" && parsed.success;
  return {
    delivery: resolveReadingDelivery({
      readingStatus: reading.data ? String(reading.data.status) : null,
      interpretationValid,
      reportStatus: report.data ? String(report.data.status) : null,
      reportHasFile: typeof report.data?.storage_path === "string" && report.data.storage_path.length > 0,
    }),
    lastError: reading.data?.last_error ? String(reading.data.last_error) : null,
    interpretation: interpretationValid && parsed.success ? parsed.data : null,
  };
}

export async function loadPaidReading(token: string) {
  const loaded = await loadChartByToken(token);
  if (!loaded || loaded.entitlement !== "active" || !loaded.entitlementId) {
    return { state: "locked" as const };
  }
  const progress = await loadReadingProgress(loaded.service, {
    chartId: loaded.chartId,
    entitlementId: loaded.entitlementId,
  });
  if (progress.delivery.phase === "failed") {
    return {
      state: "failed" as const,
      delivery: progress.delivery,
      activations: loaded.activations,
    };
  }
  if (!progress.delivery.interpretationReady || !progress.interpretation) {
    return {
      state: "processing" as const,
      delivery: progress.delivery,
      activations: loaded.activations,
    };
  }
  return {
    state: "ready" as const,
    delivery: progress.delivery,
    reading: progress.interpretation,
    activations: loaded.activations,
  };
}
