import { NextResponse } from "next/server";
import { adminReportFilename } from "@/features/admin/orders";
import { requirePermission } from "@/server/auth/session";
import { tryServiceClient } from "@/server/db/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requirePermission("reports.read");
  if (!auth.ok) return new Response(null, { status: auth.status === 401 ? 401 : 403 });
  const { orderId } = await context.params;
  if (!ORDER_ID.test(orderId)) return new Response(null, { status: 404 });
  const service = tryServiceClient();
  if (!service) return new Response(null, { status: 503 });

  const order = await service.from("orders").select("id,chart_id").eq("id", orderId).maybeSingle();
  if (!order.data?.chart_id) return new Response(null, { status: 404 });
  const report = await service
    .from("reports")
    .select("id,storage_path,status")
    .eq("chart_id", order.data.chart_id)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const storagePath = typeof report.data?.storage_path === "string" ? report.data.storage_path : null;
  if (!report.data || !storagePath) {
    return new Response("Relatório ainda não disponível", { status: 404 });
  }

  const file = await service.storage.from("reports").download(storagePath);
  if (file.error || !file.data) return new Response(null, { status: 404 });
  const bytes = Buffer.from(await file.data.arrayBuffer());
  await service.from("audit_logs").insert({
    actor_id: auth.admin.userId,
    action: "report_downloaded",
    entity: "orders",
    entity_id: orderId,
    metadata: { report_id: String(report.data.id) },
  });
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": file.data.type || "application/pdf",
      "Content-Disposition": `inline; filename="${adminReportFilename(orderId)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
