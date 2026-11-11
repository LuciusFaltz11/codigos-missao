import "server-only";
import { applyCoupon, normalizeCouponCode, type CouponRecord } from "@/features/checkout/coupons";
import type { AdminCouponRow } from "@/features/admin/coupons";
import { tryServiceClient } from "@/server/db/clients";

function mapCoupon(row: Record<string, unknown>): CouponRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    kind: row.kind === "fixed" ? "fixed" : "percent",
    percent: row.percent == null ? null : Number(row.percent),
    amountCents: row.amount_cents == null ? null : Number(row.amount_cents),
    active: Boolean(row.active),
    startsAt: typeof row.starts_at === "string" && row.starts_at ? row.starts_at : null,
    endsAt: typeof row.ends_at === "string" && row.ends_at ? row.ends_at : null,
  };
}

export async function loadAdminCoupons(): Promise<AdminCouponRow[]> {
  const service = tryServiceClient();
  if (!service) return [];
  const result = await service
    .from("coupons")
    .select("id,code,name,kind,percent,amount_cents,active,starts_at,ends_at,created_at")
    .order("created_at", { ascending: false });
  if (result.error) return [];
  return (result.data ?? []).map((row) => ({
    ...mapCoupon(row as Record<string, unknown>),
    createdAt: String((row as { created_at: string }).created_at),
  }));
}

export async function findActiveCoupon(code: string): Promise<CouponRecord | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const service = tryServiceClient();
  if (!service) return null;
  const result = await service
    .from("coupons")
    .select("id,code,name,kind,percent,amount_cents,active,starts_at,ends_at")
    .eq("code", normalized)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return mapCoupon(result.data as Record<string, unknown>);
}

export async function quoteCoupon(priceCents: number, code: string) {
  const coupon = await findActiveCoupon(code);
  if (!coupon) return { ok: false as const, reason: "invalid" as const };
  const applied = applyCoupon(priceCents, coupon);
  if (!applied.ok) return applied;
  return { ...applied, coupon };
}
