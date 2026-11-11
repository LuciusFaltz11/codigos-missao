export function pickOrderForProviderNotice<T>(input: { byExternalReference: T | null; bySlug: T | null }) {
  return input.byExternalReference ?? input.bySlug ?? null;
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
