import { describe, expect, it } from "vitest";
import {
  buildCheckoutLinkPayload,
  parseCheckoutLink,
  parsePaymentCheck,
  parseProviderError,
  parseWebhookPayload,
  slugFromCheckoutUrl,
} from "@/features/checkout/infinitepay";
import {
  isCheckoutSlug,
  isLocalOrderReference,
  orderMatchesCheckoutSlug,
  parseInfinitePayReturnUrl,
  pickLocalOrderReference,
  pickOrderForProviderNotice,
  pickUniquePendingOrder,
  readingUrlForPaidOrder,
  shouldPersistProviderNsu,
} from "@/features/checkout/return-status";
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

const linkInput = {
  handle: "minha-loja",
  orderNsu: "ord_1",
  title: "Leitura completa",
  amountCents: 3500,
  customerName: "Maria Silva",
  customerEmail: "maria@example.com",
  appUrl: "https://codigosmissao.com",
};

describe("link da InfinitePay", () => {
  it("lê o slug em checkout_url", () => {
    const parsed = parseCheckoutLink({ checkout_url: "https://checkout.infinitepay.io/minha-loja/1RxANX7tdF" });
    expect(parsed?.checkoutUrl).toContain("checkout.infinitepay.io");
    expect(parsed?.slug).toBe("1RxANX7tdF");
    expect(slugFromCheckoutUrl("https://checkout.infinitepay.io/minha-loja/abc123")).toBe("abc123");
    expect(parseCheckoutLink({ data: { checkout_url: "https://checkout.infinitepay.io/minha-loja/nested" } })?.slug).toBe("nested");
    expect(parseCheckoutLink({ url: "https://checkout.infinitepay.io/minha-loja/live-url" })?.slug).toBe("live-url");
    expect(parseProviderError({ success: false, message: "param is missing or the value is empty or invalid: handle" })).toContain("handle");
  });

  it("envia só os campos documentados do Checkout Integrado", () => {
    const httpsPayload = buildCheckoutLinkPayload(linkInput);
    expect(httpsPayload).toEqual({
      handle: "minha-loja",
      order_nsu: "ord_1",
      items: [{ quantity: 1, price: 3500, description: "Leitura completa" }],
      redirect_url: "https://codigosmissao.com/pagamento/retorno?ref=ord_1",
      webhook_url: "https://codigosmissao.com/api/webhooks/infinitepay",
      customer: { name: "Maria Silva", email: "maria@example.com" },
    });
    expect(httpsPayload).not.toHaveProperty("options");
    expect(httpsPayload).not.toHaveProperty("webhook");

    const localPayload = buildCheckoutLinkPayload({ ...linkInput, appUrl: "http://localhost:3000" });
    expect(localPayload.redirect_url).toBeUndefined();
    expect(localPayload.webhook_url).toBeUndefined();
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

  it("acha o pedido pelo slug quando a InfinitePay devolve outro order_nsu", () => {
    const stored = { id: "0f0f75b8-b4b6-4f39-a051-a82b1ca3f8ca", externalReference: "ord_1", preferenceId: "CIO2G5Dr1g" };
    const found = pickOrderForProviderNotice({
      byExternalReference: null,
      bySlug: stored,
    });
    expect(found).toEqual(stored);
    expect(
      pickOrderForProviderNotice({
        byExternalReference: null,
        bySlug: null,
        byInitPoint: stored,
      }),
    ).toEqual(stored);
    expect(shouldPersistProviderNsu("ord_1", "7a3fb3af-3574-4a1c-8a8b-03b28a456990")).toBe(false);
    expect(isLocalOrderReference("ord_2c41d6fb8fd9001b0434e503069938e0")).toBe(true);
    expect(pickLocalOrderReference("cb70e553-1ff9-4a25-b8b4-3bad88e55d48", "ord_2c41d6fb8fd9001b0434e503069938e0")).toBe(
      "ord_2c41d6fb8fd9001b0434e503069938e0",
    );
    expect(pickUniquePendingOrder([{ id: "only" }])?.id).toBe("only");
    expect(pickUniquePendingOrder([{ id: "a" }, { id: "b" }])).toBeNull();
    expect(
      parseInfinitePayReturnUrl(
        "https://codigosdamissao.valwilges.com.br/pagamento/retorno?capture_method=pix&transaction_nsu=9cf86f3e-aee3-459d-b8c5-982d7c1d78b6&slug=Gi3NyoxCKs&order_nsu=cb70e553-1ff9-4a25-b8b4-3bad88e55d48",
      ),
    ).toMatchObject({
      slug: "Gi3NyoxCKs",
      transactionNsu: "9cf86f3e-aee3-459d-b8c5-982d7c1d78b6",
      orderNsu: "cb70e553-1ff9-4a25-b8b4-3bad88e55d48",
    });
    expect(isCheckoutSlug("CIO2G5Dr1g")).toBe(true);
    expect(
      orderMatchesCheckoutSlug({
        preferenceId: null,
        initPoint: "https://checkout.infinitepay.io/loja/CIO2G5Dr1g",
        slug: "CIO2G5Dr1g",
      }),
    ).toBe(true);
    expect(
      decidePaymentTransition(
        order,
        payment({ externalReference: found?.externalReference ?? null }),
      ),
    ).toMatchObject({ action: "update", nextStatus: "approved", grantEntitlement: true });
    expect(decidePaymentTransition(order, payment({ externalReference: "7a3fb3af-3574-4a1c-8a8b-03b28a456990" }))).toMatchObject({
      action: "reject_mismatch",
      reason: "external_reference",
    });
  });

  it("só monta a URL da leitura completa com pedido aprovado e entitlement", () => {
    const appUrl = "https://codigos.example";
    expect(
      readingUrlForPaidOrder({
        status: "approved",
        entitled: true,
        token: "token-seguro-123456",
        appUrl,
      }),
    ).toBe("https://codigos.example/mapa/completo/token-seguro-123456");
    expect(
      readingUrlForPaidOrder({
        status: "approved",
        entitled: false,
        token: "token-seguro-123456",
        appUrl,
      }),
    ).toBeNull();
    expect(
      readingUrlForPaidOrder({
        status: "pending",
        entitled: true,
        token: "token-seguro-123456",
        appUrl,
      }),
    ).toBeNull();
  });
});
