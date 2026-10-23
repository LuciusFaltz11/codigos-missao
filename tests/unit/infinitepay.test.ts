import { describe, expect, it } from "vitest";
import { parseCheckoutLink, parsePaymentCheck, parseWebhookPayload, slugFromCheckoutUrl } from "@/features/checkout/infinitepay";
import { decidePaymentTransition, type ProviderPayment } from "@/features/checkout/transition";

const order = {
  externalReference: "ord_1",
  amountCents: 15000,
  currency: "BRL",
  status: "pending" as const,
  hasEntitlement: false,
};

function payment(overrides: Partial<ProviderPayment> = {}): ProviderPayment {
  return {
    id: "txn-1",
    paid: true,
    amountCents: 15000,
    currencyId: "BRL",
    externalReference: "ord_1",
    event: "paid",
    ...overrides,
  };
}

describe("link da InfinitePay", () => {
  it("lê o slug em checkout_url", () => {
    const parsed = parseCheckoutLink({ checkout_url: "https://checkout.infinitepay.io/minha-loja/1RxANX7tdF" });
    expect(parsed?.checkoutUrl).toContain("checkout.infinitepay.io");
    expect(parsed?.slug).toBe("1RxANX7tdF");
    expect(slugFromCheckoutUrl("https://checkout.infinitepay.io/minha-loja/abc123")).toBe("abc123");
  });
});

describe("webhook e payment_check", () => {
  it("recusa valor divergente", () => {
    const mismatch = decidePaymentTransition(order, payment({ amountCents: 1000 }));
    expect(mismatch).toMatchObject({ action: "reject_mismatch", reason: "amount" });
  });

  it("não libera só com o corpo do webhook ou da query", () => {
    const unpaidWebhook = decidePaymentTransition(order, payment({ paid: false, event: "paid" }));
    expect(unpaidWebhook).toMatchObject({ action: "ignore" });
    const queryWithoutCheck = decidePaymentTransition(order, payment({ paid: false, event: null }));
    expect(queryWithoutCheck.action).not.toBe("update");
    expect(parseWebhookPayload({ invoice_slug: "abc", amount: 15000 })).toBeNull();
  });

  it("libera uma vez quando o payment_check confirma o mesmo pedido e o mesmo valor", () => {
    const approved = decidePaymentTransition(order, payment());
    expect(approved).toMatchObject({ action: "update", grantEntitlement: true, nextStatus: "approved" });
    const again = decidePaymentTransition({ ...order, status: "approved", hasEntitlement: true }, payment());
    expect(again).toMatchObject({ grantEntitlement: false });
  });

  it("marca reembolso só depois de o pedido já ter sido aprovado e o check deixar de dizer pago", () => {
    const refunded = decidePaymentTransition(
      { ...order, status: "approved", hasEntitlement: true },
      payment({ paid: false, event: "refunded" }),
    );
    expect(refunded).toMatchObject({ action: "update", nextStatus: "refunded", grantEntitlement: false, refundPendingPolicy: true });
    const stillPaid = decidePaymentTransition(
      { ...order, status: "approved", hasEntitlement: true },
      payment({ paid: true, event: "refunded" }),
    );
    expect(stillPaid).toMatchObject({ action: "ignore" });
  });

  it("lê o payload documentado e o resultado do payment_check", () => {
    const notice = parseWebhookPayload({
      invoice_slug: "abc123",
      amount: 15000,
      transaction_nsu: "txn-1",
      order_nsu: "ord_1",
    });
    expect(notice).toMatchObject({ slug: "abc123", event: "paid", orderNsu: "ord_1" });
    expect(parsePaymentCheck({ success: true, paid: true, amount: 15000, paid_amount: 15100, capture_method: "pix" })).toMatchObject({
      paid: true,
      amountCents: 15000,
      paidAmountCents: 15100,
    });
    expect(parsePaymentCheck({ success: false, message: "Not found" })).toMatchObject({ paid: false });
  });
});
