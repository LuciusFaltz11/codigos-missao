import "server-only";
import { buildCheckoutLinkPayload, INFINITEPAY_API, normalizeHandle, parseCheckoutLink, parsePaymentCheck, parseProviderError } from "@/features/checkout/infinitepay";
import { getServerEnv } from "@/server/env";
import { logEvent } from "@/server/logging";

function credentials() {
  const env = getServerEnv();
  if (!env.infinitePayHandle || !env.infinitePayApiKey) return null;
  return { handle: normalizeHandle(env.infinitePayHandle), apiKey: env.infinitePayApiKey, appUrl: env.appUrl.replace(/\/$/, "") };
}

async function postJson(path: string, payload: unknown) {
  const config = credentials();
  if (!config) throw new Error("infinitepay_not_configured");
  const response = await fetch(`${INFINITEPAY_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.apiKey,
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

export async function createCheckoutLink(input: {
  orderNsu: string;
  title: string;
  amountCents: number;
  customerName: string;
  customerEmail: string;
}) {
  const config = credentials();
  if (!config) throw new Error("infinitepay_not_configured");
  const payload = buildCheckoutLinkPayload({
    handle: config.handle,
    orderNsu: input.orderNsu,
    title: input.title,
    amountCents: input.amountCents,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    appUrl: config.appUrl,
  });
  const response = await postJson("/links", payload);
  const link = parseCheckoutLink(response.body);
  if (!response.ok || !link) {
    logEvent("error", "checkout_link_failed", {
      code: "checkout_link_incomplete",
      status: response.status,
      provider: parseProviderError(response.body),
    });
    throw new Error("checkout_link_incomplete");
  }
  return link;
}

export async function checkPayment(input: { orderNsu: string; transactionNsu: string; slug: string }) {
  const config = credentials();
  if (!config) throw new Error("infinitepay_not_configured");
  const response = await postJson("/payment_check", {
    handle: config.handle,
    order_nsu: input.orderNsu,
    transaction_nsu: input.transactionNsu,
    slug: input.slug,
  });
  const checked = parsePaymentCheck(response.body);
  if (!checked) throw new Error("payment_check_unavailable");
  return checked;
}
