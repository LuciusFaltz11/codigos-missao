import "server-only";
import { isComplimentaryAmount, normalizeCouponCode } from "@/features/checkout/coupons";
import { checkoutBlockers } from "@/features/methodology/snapshot";
import { tryServiceClient, type ServiceClient } from "@/server/db/clients";
import { logEvent } from "@/server/logging";
import { createCheckoutLink } from "@/server/providers/infinitepay";
import {
  isCheckoutSlug,
  isLocalOrderReference,
  pickOrderForProviderNotice,
  readingUrlForPaidOrder,
} from "@/features/checkout/return-status";
import { createExternalReference, openToken } from "@/server/security/tokens";
import { getServerEnv } from "@/server/env";
import { deliveryStatus, loadChartByToken } from "@/server/services/charts";
import { quoteCoupon } from "@/server/services/coupons";
import { fulfillApprovedOrder } from "@/server/services/fulfillment";

export type StartCheckoutResult =
  | { ok: true; redirectTo: string; runJobs?: boolean }
  | { ok: true; initPoint: string; externalReference: string }
  | { ok: false; message: string; blockers?: string[]; code: string };

export async function startCheckout(token: string, couponCode = ""): Promise<StartCheckoutResult> {
  const loaded = await loadChartByToken(token);
  if (!loaded) return { ok: false as const, message: "Mapa não encontrado.", code: "mapa" };
  if (loaded.entitlement === "active") {
    return { ok: true as const, redirectTo: `/mapa/completo/${token}` };
  }
  if (loaded.priceCents === null || !loaded.productName) {
    const blockers = checkoutBlockers({
      chartStatus: loaded.status,
      snapshot: loaded.snapshot,
      priceCents: loaded.priceCents,
      integrations: deliveryStatus(),
      alreadyEntitled: false,
    });
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

  const complimentary = Boolean(storedCode) && isComplimentaryAmount(amountCents) && discountCents > 0;
  const blockers = checkoutBlockers({
    chartStatus: loaded.status,
    snapshot: loaded.snapshot,
    priceCents: loaded.priceCents,
    integrations: deliveryStatus(),
    alreadyEntitled: false,
    requirePaymentProvider: !complimentary,
  });
  if (blockers.length > 0) {
    return { ok: false as const, message: blockers[0] ?? "A compra não está disponível.", blockers, code: "bloqueio" };
  }

  const pending = await loaded.service
    .from("orders")
    .select("id,init_point,amount_cents,coupon_code,external_reference")
    .eq("chart_id", loaded.chartId)
    .eq("status", "pending")
    .not("init_point", "is", null);
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

  if (complimentary) {
    const fulfilled = await fulfillApprovedOrder(loaded.service, {
      orderId: String(order.data.id),
      chartId: loaded.chartId,
      leadId: loaded.leadId,
      amountCents: 0,
      currency: "BRL",
      provider: "coupon",
      providerPaymentId: `coupon:${order.data.id}`,
      analyticsName: "payment_approved",
      analyticsProperties: storedCode ? { coupon_code: storedCode, discount_cents: discountCents } : {},
    });
    if (!fulfilled.entitlementId) {
      logEvent("error", "complimentary_fulfillment_failed", { code: "entitlement" });
      return { ok: false as const, message: "Não foi possível liberar a leitura com este cupom.", blockers: [], code: "pedido" };
    }
    return { ok: true as const, redirectTo: `/mapa/completo/${token}`, runJobs: true };
  }

  try {
    const link = await createCheckoutLink({
      orderNsu: externalReference,
      title: loaded.productName,
      amountCents,
      customerName: loaded.leadName,
      customerEmail: loaded.leadEmail,
    });
    const saved = await loaded.service
      .from("orders")
      .update({ preference_id: link.slug, init_point: link.checkoutUrl })
      .eq("id", order.data.id)
      .select("id")
      .single();
    if (saved.error) {
      logEvent("error", "checkout_link_persist_failed", { code: saved.error.code ?? "db" });
      return { ok: false as const, message: "Não foi possível gravar o link de pagamento.", blockers: [], code: "link" };
    }
    await loaded.service.from("analytics_events").insert({
      name: "checkout_started",
      chart_id: loaded.chartId,
      order_id: order.data.id,
      properties: storedCode ? { coupon_code: storedCode, discount_cents: discountCents } : {},
    });
    return { ok: true as const, initPoint: link.checkoutUrl, externalReference };
  } catch (error) {
    logEvent("error", "checkout_link_failed", { code: error instanceof Error ? error.message : "checkout_link_failed" });
    return { ok: false as const, message: "A InfinitePay não confirmou o link de pagamento.", blockers: [], code: "link" };
  }
}

const PAYMENT_ORDER_COLUMNS = "id,external_reference,amount_cents,currency,status,chart_id,lead_id,preference_id,init_point";

export type PaymentOrderRow = {
  id: string;
  external_reference: string;
  amount_cents: number;
  currency: string;
  status: string;
  chart_id: string;
  lead_id: string;
  preference_id: string | null;
  init_point: string | null;
};

async function latestOrder(query: PromiseLike<{ data: unknown; error: { message?: string } | null }>) {
  const result = await query;
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  return (rows[0] as PaymentOrderRow | undefined) ?? null;
}

export async function findOrderForPaymentNotice(
  service: ServiceClient,
  input: { orderNsu?: string | null; slug?: string | null; localRef?: string | null; orderId?: string | null },
) {
  const byId = input.orderId
    ? await latestOrder(service.from("orders").select(PAYMENT_ORDER_COLUMNS).eq("id", input.orderId).limit(1))
    : null;
  if (byId) return byId;

  const localRef = input.localRef && isLocalOrderReference(input.localRef) ? input.localRef : null;
  const byLocalRef = localRef
    ? await latestOrder(
        service.from("orders").select(PAYMENT_ORDER_COLUMNS).eq("external_reference", localRef).limit(1),
      )
    : null;
  const byReference = input.orderNsu
    ? await latestOrder(
        service.from("orders").select(PAYMENT_ORDER_COLUMNS).eq("external_reference", input.orderNsu).limit(1),
      )
    : null;
  const slug = isCheckoutSlug(input.slug) ? input.slug : null;
  const bySlug = !byLocalRef && !byReference && slug
    ? await latestOrder(
        service
          .from("orders")
          .select(PAYMENT_ORDER_COLUMNS)
          .eq("preference_id", slug)
          .order("created_at", { ascending: false })
          .limit(1),
      )
    : null;
  const byInitPoint = !byLocalRef && !byReference && !bySlug && slug
    ? await latestOrder(
        service
          .from("orders")
          .select(PAYMENT_ORDER_COLUMNS)
          .ilike("init_point", `%${slug}%`)
          .order("created_at", { ascending: false })
          .limit(1),
      )
    : null;
  return pickOrderForProviderNotice({
    byLocalRef,
    byExternalReference: byReference,
    bySlug,
    byInitPoint,
  });
}

export async function orderStatusByReference(externalReference: string) {
  return loadOrderReturnView({ ref: externalReference });
}

export type OrderReturnView = {
  configured: boolean;
  status: string;
  readingUrl: string | null;
  amountCents: number | null;
  email: string | null;
  orderId: string | null;
  orderRef: string | null;
};

function emptyReturnView(status: string, configured = true): OrderReturnView {
  return { configured, status, readingUrl: null, amountCents: null, email: null, orderId: null, orderRef: null };
}

export async function loadOrderReturnView(input: {
  ref?: string | null;
  slug?: string | null;
  localRef?: string | null;
}): Promise<OrderReturnView> {
  const service = tryServiceClient();
  if (!service) return emptyReturnView("not_configured", false);
  const order = await findOrderForPaymentNotice(service, {
    orderNsu: input.ref,
    slug: input.slug,
    localRef: input.localRef,
  });
  if (!order) return emptyReturnView("unknown");

  const entitlement = await service
    .from("entitlements")
    .select("id,revoked_at,refund_pending_policy")
    .eq("order_id", order.id)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const entitled = Boolean(
    entitlement.data && !entitlement.data.revoked_at && !entitlement.data.refund_pending_policy,
  );
  let token: string | null = null;
  if (entitled && order.chart_id) {
    const chart = await service.from("natal_charts").select("access_token_id").eq("id", order.chart_id).maybeSingle();
    const sealed = chart.data
      ? await service.from("access_tokens").select("token_sealed").eq("id", chart.data.access_token_id).maybeSingle()
      : null;
    if (sealed?.data?.token_sealed) {
      try {
        token = openToken(String(sealed.data.token_sealed));
      } catch {
        token = null;
      }
    }
  }
  const readingUrl = readingUrlForPaidOrder({
    status: String(order.status),
    entitled,
    token,
    appUrl: getServerEnv().appUrl,
  });
  const lead = order.lead_id
    ? await service.from("leads").select("email").eq("id", order.lead_id).maybeSingle()
    : { data: null };
  const email =
    lead.data && typeof lead.data.email === "string" && lead.data.email.trim() ? lead.data.email.trim() : null;
  return {
    configured: true,
    status: String(order.status),
    readingUrl,
    amountCents: Number(order.amount_cents),
    email,
    orderId: String(order.id),
    orderRef: String(order.external_reference),
  };
}
