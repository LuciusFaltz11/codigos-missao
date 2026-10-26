import { couponDiscountLabel, type CouponKind, type CouponRecord } from "@/features/checkout/coupons";

export type AdminCouponRow = CouponRecord & {
  createdAt: string;
};

export { couponDiscountLabel };
export type { CouponKind };

export const KIND_LABEL: Record<CouponKind, string> = {
  percent: "Percentual",
  fixed: "Valor em reais",
};
