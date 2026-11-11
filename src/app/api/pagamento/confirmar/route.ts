import { after } from "next/server";
import { runDueJobs } from "@/server/jobs/runner";
import { recordAndProcessPayment } from "@/server/services/webhook";
import { loadOrderReturnView } from "@/server/services/checkout";

export const runtime = "nodejs";
export const maxDuration = 60;

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const orderNsu = text(body?.order_nsu);
  const transactionNsu = text(body?.transaction_nsu);
  const slug = text(body?.slug);
  if (!transactionNsu || (!orderNsu && !slug)) {
    return Response.json({ ok: false, status: "unknown", readingUrl: null }, { status: 400 });
  }
  const result = await recordAndProcessPayment({
    orderNsu,
    transactionNsu,
    slug,
    event: "paid",
  });
  if (!result.ok) return Response.json({ ok: false, status: "unknown", readingUrl: null }, { status: result.httpStatus });
  if (result.approved) {
    after(async () => {
      await runDueJobs(3);
    });
  }
  const view = await loadOrderReturnView({ ref: orderNsu, slug });
  return Response.json({
    ok: true,
    status: view.status,
    readingUrl: view.readingUrl,
  });
}
