import { after } from "next/server";
import { cookies } from "next/headers";
import { CHECKOUT_REF_COOKIE, pickLocalOrderReference } from "@/features/checkout/return-status";
import { runDueJobs } from "@/server/jobs/runner";
import { recordAndProcessPayment } from "@/server/services/webhook";
import { loadOrderReturnView } from "@/server/services/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const orderNsu = text(body?.order_nsu);
  const transactionNsu = text(body?.transaction_nsu);
  const slug = text(body?.slug);
  const cookieStore = await cookies();
  const localRef = pickLocalOrderReference(text(body?.local_ref), cookieStore.get(CHECKOUT_REF_COOKIE)?.value);
  if (!transactionNsu || (!orderNsu && !slug && !localRef)) {
    return Response.json(
      { ok: false, status: "unknown", readingUrl: null, amountCents: null, email: null, note: "missing_reference" },
      { status: 400, headers: NO_STORE },
    );
  }
  const result = await recordAndProcessPayment({
    orderNsu,
    transactionNsu,
    slug,
    localRef,
    event: "paid",
  });
  if (result.ok && result.approved) {
    after(async () => {
      await runDueJobs(3);
    });
  }
  const view = await loadOrderReturnView({ ref: orderNsu, slug, localRef });
  const status = view.status !== "unknown" ? view.status : result.status ?? "unknown";
  return Response.json(
    {
      ok: result.ok,
      status,
      readingUrl: view.readingUrl,
      amountCents: view.amountCents,
      email: view.email,
      note: result.note ?? (result.ok ? null : "payment_check_failed"),
    },
    { headers: NO_STORE },
  );
}
