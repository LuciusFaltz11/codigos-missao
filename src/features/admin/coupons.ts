import { couponDiscountLabel, couponWindow, type CouponKind, type CouponRecord, type CouponWindow } from "@/features/checkout/coupons";
import { formatDateTimePt } from "@/lib/formatters";

export type AdminCouponRow = CouponRecord & {
  createdAt: string;
};

export { couponDiscountLabel };
export type { CouponKind };

export const KIND_LABEL: Record<CouponKind, string> = {
  percent: "Percentual",
  fixed: "Valor em reais",
};

export const WINDOW_LABEL: Record<CouponWindow, string> = {
  ok: "Ativo",
  inactive: "Inativo",
  not_started: "Agendado",
  expired: "Expirado",
};

export function couponStateLabel(coupon: Pick<CouponRecord, "active" | "startsAt" | "endsAt">) {
  return WINDOW_LABEL[couponWindow(coupon)];
}

export function couponScheduleLabel(coupon: Pick<CouponRecord, "startsAt" | "endsAt">) {
  if (coupon.startsAt && coupon.endsAt) {
    return `${formatDateTimePt(coupon.startsAt)} — ${formatDateTimePt(coupon.endsAt)}`;
  }
  if (coupon.startsAt) return `A partir de ${formatDateTimePt(coupon.startsAt)}`;
  if (coupon.endsAt) return `Até ${formatDateTimePt(coupon.endsAt)}`;
  return "Até desativar";
}

export function datetimeLocalToIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) return null;
  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const date = new Date(`${withSeconds}-03:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isoToDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return formatted.replace(" ", "T");
}
