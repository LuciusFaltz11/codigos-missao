export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded";

export type InfinitePayEvent = "created" | "paid" | "settled" | "canceled" | "refunded" | "payment_failed";

export type ProviderPayment = {
  id: string;
  paid: boolean;
  amountCents: number;
  currencyId: string;
  externalReference: string | null;
  event: InfinitePayEvent | null;
};

export type OrderSnapshot = {
  externalReference: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  hasEntitlement: boolean;
};

export type TransitionDecision =
  | { action: "ignore"; reason: string }
  | { action: "reject_mismatch"; reason: "external_reference" | "currency" | "amount" }
  | {
      action: "update";
      nextStatus: PaymentStatus;
      grantEntitlement: boolean;
      refundPendingPolicy: boolean;
    };

export function mapCheckedStatus(payment: ProviderPayment): PaymentStatus | null {
  if (payment.paid) return "approved";
  if (payment.event === "created" || payment.event === "settled") return null;
  if (payment.event === "payment_failed") return "rejected";
  if (payment.event === "canceled") return "cancelled";
  if (payment.event === "refunded") return "refunded";
  return null;
}

export function decidePaymentTransition(
  order: OrderSnapshot,
  payment: ProviderPayment,
): TransitionDecision {
  if (!payment.externalReference || payment.externalReference !== order.externalReference) {
    return { action: "reject_mismatch", reason: "external_reference" };
  }
  if (payment.currencyId !== order.currency) {
    return { action: "reject_mismatch", reason: "currency" };
  }
  if (payment.amountCents !== order.amountCents) {
    return { action: "reject_mismatch", reason: "amount" };
  }
  if (payment.event === "refunded" && payment.paid) {
    return { action: "ignore", reason: "still_paid" };
  }

  const mapped = mapCheckedStatus(payment);
  if (!mapped) return { action: "ignore", reason: payment.paid ? "unknown_status" : "unpaid_or_informational" };

  if (order.status === "approved" && (mapped === "pending" || mapped === "rejected" || mapped === "cancelled")) {
    return { action: "ignore", reason: "out_of_order" };
  }
  if (order.status === "refunded" && mapped !== "refunded") {
    return { action: "ignore", reason: "refund_is_later_state" };
  }
  if (mapped === "approved") {
    return {
      action: "update",
      nextStatus: "approved",
      grantEntitlement: !order.hasEntitlement,
      refundPendingPolicy: false,
    };
  }
  if (mapped === "refunded") {
    const wasApproved = order.hasEntitlement || order.status === "approved";
    if (!wasApproved) return { action: "ignore", reason: "refund_without_approval" };
    return {
      action: "update",
      nextStatus: "refunded",
      grantEntitlement: false,
      refundPendingPolicy: true,
    };
  }
  if (order.status === mapped) return { action: "ignore", reason: "already_applied" };
  return { action: "update", nextStatus: mapped, grantEntitlement: false, refundPendingPolicy: false };
}
