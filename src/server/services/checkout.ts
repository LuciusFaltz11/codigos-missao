import "server-only";
import { checkoutBlockers } from "@/features/methodology/snapshot";
import { normalizeCouponCode } from "@/features/checkout/coupons";
import { tryServiceClient } from "@/server/db/clients";
import { logEvent } from "@/server/logging";
import { createCheckoutLink } from "@/server/providers/infinitepay";
import { deliveryStatus, loadChartByToken } from "@/server/services/charts";
import { quoteCoupon } from "@/server/services/coupons";
import { createExternalReference } from "@/server/security/tokens";

export async function startCheckout(token: string, couponCode = "") {
  const loaded = await loadChartByToken(token);
  if (!loaded) return { ok: false as const, message: "Mapa não encontrado.", code: "mapa" };
  const blockers = checkoutBlockers({
    chartStatus: loaded.status,
    snapshot: loaded.snapshot,
    priceCents: loaded.priceCents,
    integrations: deliveryStatus(),
    alreadyEntitled: loaded.entitlement === "active",
  });
  if (blockers.length > 0 || loaded.priceCents === null || !loaded.productName) {
    return { ok: false as const, message: blockers[0] ?? "A compra não está disponível.", blockers, code: "bloqueio" };
  }

  const typedCode = normalizeCouponCode(couponCode);
  let amountCents = loaded.priceCents;
  let discountCents = 0;
  let couponId: string | null = null;
  let storedCode: string | null = null;
  if (typedCode) {
    const quoted = await quoteCoupon(loaded.priceCents, typedCode);
    if (!quoted.ok) {
      const code = quoted.reason === "below_minimum" ? "minimo" : "cupom";
      return { ok: false as const, message: "Este cupom não se aplica a esta compra.", blockers: [], code };
    }
    amountCents = quoted.amountCents;
    discountCents = quoted.discountCents;
    couponId = quoted.coupon.id;
    storedCode = quoted.coupon.code;
  }

  const pending = await loaded.service
    .from("orders")
    .select("id,init_point,amount_cents,coupon_code")
    .eq("chart_id", loaded.chartId)
    .eq("status", "pending")
    .not("init_point", "is", null);
  const reusable = (pending.data ?? []).find(
    (order) =>
      Number(order.amount_cents) === amountCents &&
      (order.coupon_code ?? null) === storedCode &&
      order.init_point,
  );
  if (reusable?.init_point) {
    return { ok: true as const, initPoint: String(reusable.init_point) };
  }
  if (pending.data?.length) {
    await loaded.service
      .from("orders")
      .update({ status: "cancelled" })
      .eq("chart_id", loaded.chartId)
      .eq("status", "pending");
  }

  const product = await loaded.service.from("products").select("id").eq("active", true).limit(1).maybeSingle();
  if (!product.data) return { ok: false as const, message: "Produto indisponível.", blockers: [], code: "bloqueio" };

  const externalReference = createExternalReference();
  const order = await loaded.service
    .from("orders")
    .insert({
      lead_id: loaded.leadId,
      chart_id: loaded.chartId,
      product_id: product.data.id,
      amount_cents: amountCents,
      currency: "BRL",
      status: "pending",
      external_reference: externalReference,
      coupon_id: couponId,
      coupon_code: storedCode,
      discount_cents: discountCents,
    })
    .select("id")
    .single();
  if (order.error || !order.data) return { ok: false as const, message: "Não foi possível abrir o pedido.", blockers: [], code: "pedido" };

  try {
    const link = await createCheckoutLink({
      orderNsu: externalReference,
      title: loaded.productName,
      amountCents,
      customerName: loaded.leadName,
      customerEmail: loaded.leadEmail,
    });
    await loaded.service
      .from("orders")
      .update({ preference_id: link.slug, init_point: link.checkoutUrl })
      .eq("id", order.data.id);
    await loaded.service.from("analytics_events").insert({
      name: "checkout_started",
      chart_id: loaded.chartId,
      order_id: order.data.id,
      properties: storedCode ? { coupon_code: storedCode, discount_cents: discountCents } : {},
    });
    return { ok: true as const, initPoint: link.checkoutUrl };
  } catch (error) {
    logEvent("error", "checkout_link_failed", { code: error instanceof Error ? error.message : "checkout_link_failed" });
    return { ok: false as const, message: "A InfinitePay não confirmou o link de pagamento.", blockers: [], code: "link" };
  }
}

export async function orderStatusByReference(externalReference: string) {
  const service = tryServiceClient();
  if (!service) return { configured: false as const };
  const order = await service
    .from("orders")
    .select("status,chart_id")
    .eq("external_reference", externalReference)
    .maybeSingle();
  if (!order.data) return { configured: true as const, status: "unknown" as const };
  return { configured: true as const, status: String(order.data.status) };
}
