export function isCheckoutSlug(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{4,64}$/.test(value));
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
}) {
  return input.byExternalReference ?? input.bySlug ?? input.byInitPoint ?? null;
}

export function shouldPersistProviderNsu(stored: string, incoming: string | null | undefined) {
  return Boolean(incoming && incoming !== stored);
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
