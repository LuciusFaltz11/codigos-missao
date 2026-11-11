export const CHECKOUT_REF_COOKIE = "cm_checkout_ref";

export function isCheckoutSlug(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{4,64}$/.test(value));
}

export function isLocalOrderReference(value: string | null | undefined): value is string {
  return Boolean(value && /^ord_[A-Za-z0-9]+$/.test(value));
}

export function pickLocalOrderReference(...values: Array<string | null | undefined>) {
  return values.find(isLocalOrderReference) ?? null;
}

export function pickProviderOrderNsu(...values: Array<string | null | undefined>) {
  return values.find((value) => Boolean(value && !isLocalOrderReference(value))) ?? null;
}

export function parseInfinitePayReturnUrl(value: string) {
  try {
    const url = new URL(value);
    const orderNsu = url.searchParams.get("order_nsu");
    const transactionNsu = url.searchParams.get("transaction_nsu") ?? url.searchParams.get("transaction_id");
    const slug = url.searchParams.get("slug");
    if (!transactionNsu && !slug && !orderNsu) return null;
    return { orderNsu, transactionNsu, slug };
  } catch {
    return null;
  }
}

export function orderMatchesCheckoutSlug(input: {
  preferenceId?: string | null;
  initPoint?: string | null;
  slug: string;
}) {
  if (!isCheckoutSlug(input.slug)) return false;
  if (input.preferenceId === input.slug) return true;
  if (input.initPoint && input.initPoint.includes(input.slug)) return true;
  return false;
}

export function pickOrderForProviderNotice<T>(input: {
  byExternalReference: T | null;
  bySlug: T | null;
  byInitPoint?: T | null;
  byLocalRef?: T | null;
}) {
  return input.byLocalRef ?? input.byExternalReference ?? input.bySlug ?? input.byInitPoint ?? null;
}

export function shouldPersistProviderNsu(stored: string, incoming: string | null | undefined) {
  if (!incoming || incoming === stored) return false;
  if (isLocalOrderReference(stored)) return false;
  return true;
}

export function pickUniquePendingOrder<T>(orders: T[]) {
  return orders.length === 1 ? orders[0] : null;
}

export function readingUrlForPaidOrder(input: {
  status: string;
  entitled: boolean;
  token: string | null;
  appUrl: string;
}) {
  if (input.status !== "approved" || !input.entitled || !input.token) return null;
  return `${input.appUrl.replace(/\/$/, "")}/mapa/completo/${input.token}`;
}

export function isTerminalPaymentStatus(status: string) {
  return status === "approved" || status === "rejected" || status === "cancelled" || status === "refunded";
}
