import { formatBrl } from "@/lib/formatters";

export const MIN_CHARGE_CENTS = 100;

export type CouponKind = "percent" | "fixed";

export type CouponRecord = {
  id: string;
  code: string;
  name: string;
  kind: CouponKind;
  percent: number | null;
  amountCents: number | null;
  active: boolean;
};

export type CouponApplication =
  | { ok: true; amountCents: number; discountCents: number }
  | { ok: false; reason: "inactive" | "invalid" | "below_minimum" };

export function normalizeCouponCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function applyCoupon(priceCents: number, coupon: CouponRecord): CouponApplication {
  if (!coupon.active) return { ok: false, reason: "inactive" };
  let discountCents = 0;
  if (coupon.kind === "percent") {
    if (coupon.percent == null || coupon.percent < 1 || coupon.percent > 100) return { ok: false, reason: "invalid" };
    discountCents = Math.round((priceCents * coupon.percent) / 100);
  } else {
    if (coupon.amountCents == null || coupon.amountCents < 1) return { ok: false, reason: "invalid" };
    discountCents = Math.min(coupon.amountCents, priceCents);
  }
  const amountCents = priceCents - discountCents;
  if (amountCents < MIN_CHARGE_CENTS) return { ok: false, reason: "below_minimum" };
  return { ok: true, amountCents, discountCents };
}

export function couponDiscountLabel(coupon: Pick<CouponRecord, "kind" | "percent" | "amountCents">) {
  if (coupon.kind === "percent") return `${coupon.percent}%`;
  if (coupon.amountCents == null) return "—";
  return formatBrl(coupon.amountCents);
}
