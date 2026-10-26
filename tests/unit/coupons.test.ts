import { describe, expect, it } from "vitest";
import { applyCoupon, couponDiscountLabel, couponOfferLabel, normalizeCouponCode, type CouponRecord } from "@/features/checkout/coupons";
import { formatBrl } from "@/lib/formatters";

function coupon(partial: Partial<CouponRecord>): CouponRecord {
  return {
    id: "c1",
    code: "LANCA10",
    name: "Lançamento",
    kind: "percent",
    percent: 10,
    amountCents: null,
    active: true,
    ...partial,
  };
}

describe("cupons", () => {
  it("normaliza o código em maiúsculas sem espaços", () => {
    expect(normalizeCouponCode("  lanca 10 ")).toBe("LANCA10");
  });

  it("aplica percentual sobre o preço", () => {
    const result = applyCoupon(9700, coupon({ percent: 10 }));
    expect(result).toEqual({ ok: true, amountCents: 8730, discountCents: 970 });
  });

  it("aplica valor fixo sem passar do preço", () => {
    const result = applyCoupon(9700, coupon({ kind: "fixed", percent: null, amountCents: 2000 }));
    expect(result).toEqual({ ok: true, amountCents: 7700, discountCents: 2000 });
  });

  it("recusa cupom inativo ou que deixa a cobrança abaixo de R$ 1,00", () => {
    expect(applyCoupon(9700, coupon({ active: false })).ok).toBe(false);
    expect(applyCoupon(9700, coupon({ percent: 100 })).ok).toBe(false);
    expect(applyCoupon(1500, coupon({ kind: "fixed", percent: null, amountCents: 1500 })).ok).toBe(false);
  });

  it("rotula percentual e valor para o painel", () => {
    expect(couponDiscountLabel({ kind: "percent", percent: 15, amountCents: null })).toBe("15%");
    expect(couponDiscountLabel({ kind: "fixed", percent: null, amountCents: 2500 })).toBe(formatBrl(2500));
  });

  it("descreve o cupom aplicado na oferta", () => {
    expect(couponOfferLabel(coupon({ code: "TESTE90", percent: 90 }))).toBe("TESTE90 · 90% de desconto");
    expect(couponOfferLabel(coupon({ kind: "fixed", percent: null, amountCents: 2000 }))).toBe(
      `LANCA10 · ${formatBrl(2000)} de desconto`,
    );
  });
});
