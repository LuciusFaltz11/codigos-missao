import "server-only";
import { getServerEnv } from "@/server/env";
import {
  INFINITEPAY_API,
  normalizeHandle,
  parseCheckoutLink,
  parsePaymentCheck,
} from "@/features/checkout/infinitepay";

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
  const webhookUrl = config.appUrl.startsWith("https://") ? `${config.appUrl}/api/webhooks/infinitepay` : undefined;
  const payload: Record<string, unknown> = {
    handle: config.handle,
    order_nsu: input.orderNsu,
    redirect_url: `${config.appUrl}/pagamento/retorno`,
    items: [{ quantity: 1, price: input.amountCents, description: input.title }],
    customer: { name: input.customerName, email: input.customerEmail },
    options: {
      single_payment: true,
      require_delivery_address: false,
      payment_methods_enabled: ["credit_card", "pix"],
    },
  };
  if (webhookUrl) {
    payload.webhook = {
      url: webhookUrl,
      events: ["paid", "refunded", "canceled", "payment_failed"],
    };
  }
  const response = await postJson("/links", payload);
  const link = parseCheckoutLink(response.body);
  if (!response.ok || !link) throw new Error("checkout_link_incomplete");
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
