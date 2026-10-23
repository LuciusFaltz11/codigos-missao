import { after } from "next/server";
import { parseWebhookPayload } from "@/features/checkout/infinitepay";
import { getServerEnv } from "@/server/env";
import { runDueJobs } from "@/server/jobs/runner";
import { recordAndProcessPayment } from "@/server/services/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.infinitePayHandle || !env.infinitePayApiKey) return new Response(null, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 200 });
  }
  const parsed = parseWebhookPayload(body);
  if (!parsed?.orderNsu || !parsed.transactionNsu) return new Response(null, { status: 200 });
  const result = await recordAndProcessPayment({
    orderNsu: parsed.orderNsu,
    transactionNsu: parsed.transactionNsu,
    slug: parsed.slug,
    event: parsed.event,
  });
  if (!result.ok) return new Response(null, { status: 400 });
  after(async () => {
    await runDueJobs(3);
  });
  return new Response(null, { status: 200 });
}
