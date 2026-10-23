import { NextResponse } from "next/server";
import { loadChartByToken } from "@/server/services/charts";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const loaded = await loadChartByToken(token);
  if (!loaded || loaded.entitlement !== "active") return new Response(null, { status: 404 });
  const report = await loaded.service
    .from("reports")
    .select("storage_path,status")
    .eq("chart_id", loaded.chartId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!report.data?.storage_path) return new Response("Relatório ainda não disponível", { status: 404 });
  const signed = await loaded.service.storage.from("reports").createSignedUrl(String(report.data.storage_path), 60 * 10);
  if (signed.error || !signed.data?.signedUrl) return new Response(null, { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl);
}
