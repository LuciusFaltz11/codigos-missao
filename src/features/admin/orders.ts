export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABEL[status] ?? status;
}

export function paymentProviderLabel(provider: string) {
  if (provider === "infinitepay") return "InfinitePay";
  if (provider === "coupon") return "Cupom";
  return provider;
}

export type AdminOrderPayment = {
  id: string;
  provider: string;
  providerPaymentId: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: string;
};

export type AdminOrderEntitlement = {
  id: string;
  grantedAt: string;
  revokedAt: string | null;
  refundPendingPolicy: boolean;
};

export type AdminOrderReading = {
  id: string;
  status: string;
  promptVersion: string;
  model: string | null;
  lastError: string | null;
  createdAt: string;
};

export type AdminOrderReport = {
  id: string;
  status: string;
  storagePath: string | null;
  createdAt: string;
};

export type AdminOrderEmail = {
  id: string;
  status: string;
  providerId: string | null;
  lastError: string | null;
  createdAt: string;
};

export type AdminOrder = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  discountCents: number;
  originalCents: number;
  couponId: string | null;
  couponCode: string | null;
  couponName: string | null;
  couponKind: string | null;
  couponPercent: number | null;
  couponAmountCents: number | null;
  externalReference: string;
  preferenceId: string | null;
  initPoint: string | null;
  leadId: string;
  leadName: string;
  leadEmail: string;
  chartId: string;
  productId: string;
  productName: string | null;
  productPriceCents: number | null;
  createdAt: string;
  updatedAt: string;
  payments: AdminOrderPayment[];
  entitlement: AdminOrderEntitlement | null;
  reading: AdminOrderReading | null;
  report: AdminOrderReport | null;
  emails: AdminOrderEmail[];
};
