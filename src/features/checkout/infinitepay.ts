import type { InfinitePayEvent } from "@/features/checkout/transition";

export const INFINITEPAY_API = "https://api.checkout.infinitepay.io";

export type CheckoutLink = {
  checkoutUrl: string;
  slug: string | null;
};

export type PaymentCheck = {
  success: boolean;
  paid: boolean;
  amountCents: number | null;
  paidAmountCents: number | null;
  installments: number | null;
  captureMethod: string | null;
};

export type WebhookNotice = {
  orderNsu: string | null;
  transactionNsu: string | null;
  slug: string | null;
  event: InfinitePayEvent | null;
  amountCents: number | null;
};

const EVENTS: InfinitePayEvent[] = ["created", "paid", "settled", "canceled", "refunded", "payment_failed"];

export function normalizeHandle(value: string) {
  return value.trim().replace(/^\$/, "");
}

export function slugFromCheckoutUrl(checkoutUrl: string) {
  try {
    const url = new URL(checkoutUrl);
    if (url.hostname !== "checkout.infinitepay.io") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[1] ?? parts[0] ?? null;
  } catch {
    return null;
  }
}

function textField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function centsField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function parseEvent(value: unknown): InfinitePayEvent | null {
  return typeof value === "string" && EVENTS.includes(value as InfinitePayEvent) ? (value as InfinitePayEvent) : null;
}

export function parseCheckoutLink(body: unknown): CheckoutLink | null {
  if (!body || typeof body !== "object") return null;
  const checkoutUrl = textField((body as { checkout_url?: unknown }).checkout_url);
  if (!checkoutUrl) return null;
  return { checkoutUrl, slug: slugFromCheckoutUrl(checkoutUrl) };
}

export function parsePaymentCheck(body: unknown): PaymentCheck | null {
  if (!body || typeof body !== "object") return null;
  const record = body as {
    success?: unknown;
    paid?: unknown;
    amount?: unknown;
    paid_amount?: unknown;
    installments?: unknown;
    capture_method?: unknown;
  };
  if (typeof record.paid !== "boolean" && record.success !== true && record.success !== false) return null;
  return {
    success: record.success === true,
    paid: record.paid === true,
    amountCents: centsField(record.amount),
    paidAmountCents: centsField(record.paid_amount),
    installments: centsField(record.installments),
    captureMethod: textField(record.capture_method),
  };
}

export function parseWebhookPayload(body: unknown): WebhookNotice | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const orderNsu = textField(record.order_nsu);
  const transactionNsu = textField(record.transaction_nsu);
  const slug = textField(record.invoice_slug) ?? textField(record.slug);
  const event = parseEvent(record.event) ?? parseEvent(record.type) ?? (transactionNsu && slug ? "paid" : null);
  if (!orderNsu && !transactionNsu) return null;
  return {
    orderNsu,
    transactionNsu,
    slug,
    event,
    amountCents: centsField(record.amount),
  };
}
