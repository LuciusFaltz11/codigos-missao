import "server-only";
import { isCheckoutSlug, pickProviderOrderNsu, shouldPersistProviderNsu } from "@/features/checkout/return-status";
import { decidePaymentTransition, type InfinitePayEvent, type PaymentStatus, type ProviderPayment } from "@/features/checkout/transition";
import { tryServiceClient } from "@/server/db/clients";
import { logEvent } from "@/server/logging";
import { checkPayment } from "@/server/providers/infinitepay";
import { findOrderForPaymentNotice, type PaymentOrderRow } from "@/server/services/checkout";
import { fulfillApprovedOrder } from "@/server/services/fulfillment";

export type ProcessPaymentResult =
  | { ok: false; httpStatus: number; duplicate?: undefined; approved?: undefined; status?: undefined; note?: string }
  | { ok: true; duplicate: boolean; approved: boolean; status: string | null; note?: string };

export async function recordAndProcessPayment(input: {
  orderNsu: string | null;
  transactionNsu: string;
  slug: string | null;
  event: InfinitePayEvent | null;
  localRef?: string | null;
  orderId?: string | null;
}): Promise<ProcessPaymentResult> {
  const service = tryServiceClient();
  if (!service) return { ok: false as const, httpStatus: 503 };

  const eventKey = input.event ?? "paid";
  const deliveryKey = `${input.transactionNsu}:${eventKey}`;
  const inserted = await service.from("payment_webhook_events").insert({
    delivery_key: deliveryKey,
    request_id: eventKey,
    data_id: input.transactionNsu,
    signature_valid: false,
  });
  if (inserted.error && inserted.error.code !== "23505") {
    logEvent("error", "webhook_persist_failed", { code: inserted.error.code ?? "db" });
    return { ok: false as const, httpStatus: 500 };
  }
  if (inserted.error?.code === "23505") {
    const existing = await service
      .from("payment_webhook_events")
      .select("processed_at")
      .eq("delivery_key", deliveryKey)
      .maybeSingle();
    if (existing.data?.processed_at) {
      const known = await findOrderForPaymentNotice(service, {
        orderNsu: input.orderNsu,
        slug: input.slug,
        localRef: input.localRef,
        orderId: input.orderId,
      });
      return {
        ok: true as const,
        duplicate: true,
        approved: known?.status === "approved",
        status: known ? String(known.status) : null,
        note: "already_processed",
      };
    }
  }

  let order: PaymentOrderRow | null = await findOrderForPaymentNotice(service, {
    orderNsu: input.orderNsu,
    slug: input.slug,
    localRef: input.localRef,
    orderId: input.orderId,
  });

  const slug = isCheckoutSlug(input.slug)
    ? input.slug
    : isCheckoutSlug(order?.preference_id)
      ? String(order?.preference_id)
      : null;
  if (!slug) {
    await service.from("payment_webhook_events").update({ process_note: "missing_slug" }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false, approved: false, status: order ? String(order.status) : null, note: "missing_slug" };
  }

  const providerNsu = pickProviderOrderNsu(input.orderNsu) ?? input.orderNsu ?? (order ? String(order.external_reference) : null);
  if (!providerNsu) {
    await service.from("payment_webhook_events").update({ process_note: "missing_nsu" }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false, approved: false, status: order ? String(order.status) : null, note: "missing_reference" };
  }

  let checked;
  try {
    checked = await checkPayment({
      orderNsu: providerNsu,
      transactionNsu: input.transactionNsu,
      slug,
    });
  } catch (error) {
    logEvent("error", "payment_check_failed", { code: error instanceof Error ? error.message : "payment_check_failed" });
    return { ok: false as const, httpStatus: 400, note: "payment_check_failed" };
  }

  if (!order) {
    await service.from("payment_webhook_events").update({ process_note: "order_not_found" }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false, approved: false, status: null, note: "order_not_found" };
  }

  if (shouldPersistProviderNsu(String(order.external_reference), input.orderNsu) && input.orderNsu) {
    const persisted = await service.from("orders").update({ external_reference: input.orderNsu }).eq("id", order.id);
    if (!persisted.error) order.external_reference = input.orderNsu;
  }
  if (input.slug && input.slug !== order.preference_id) {
    await service.from("orders").update({ preference_id: input.slug }).eq("id", order.id);
    order.preference_id = input.slug;
  }

  const amountCents = checked.paid ? checked.amountCents : (checked.amountCents ?? Number(order.amount_cents));
  if (amountCents === null) {
    await service.from("payment_webhook_events").update({ process_note: "missing_amount" }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false, approved: false, status: String(order.status) };
  }

  const payment: ProviderPayment = {
    id: input.transactionNsu,
    paid: checked.paid,
    amountCents,
    currencyId: "BRL",
    externalReference: String(order.external_reference),
    event: input.event,
  };

  const entitlement = await service.from("entitlements").select("id").eq("order_id", order.id).maybeSingle();
  const decision = decidePaymentTransition(
    {
      externalReference: String(order.external_reference),
      amountCents: Number(order.amount_cents),
      currency: String(order.currency),
      status: String(order.status) as PaymentStatus,
      hasEntitlement: Boolean(entitlement.data),
    },
    payment,
  );

  let status = String(order.status);
  if (decision.action === "reject_mismatch") {
    await service.from("audit_logs").insert({
      actor_id: null,
      action: "payment_mismatch",
      entity: "orders",
      entity_id: String(order.id),
      metadata: { reason: decision.reason, provider_payment_id: payment.id },
    });
    await service.from("payment_webhook_events").update({ process_note: decision.reason }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false, approved: status === "approved", status };
  }

  if (decision.action === "update") {
    status = decision.nextStatus;
    if (decision.nextStatus === "approved") {
      await fulfillApprovedOrder(service, {
        orderId: String(order.id),
        chartId: String(order.chart_id),
        leadId: String(order.lead_id),
        amountCents: Number(order.amount_cents),
        currency: String(order.currency),
        provider: "infinitepay",
        providerPaymentId: payment.id,
      });
    } else {
      await service.from("payments").upsert(
        {
          order_id: order.id,
          provider: "infinitepay",
          provider_payment_id: payment.id,
          status: decision.nextStatus,
          amount_cents: Number(order.amount_cents),
          currency: String(order.currency),
        },
        { onConflict: "provider,provider_payment_id" },
      );
      await service.from("orders").update({ status: decision.nextStatus }).eq("id", order.id);
      if (decision.refundPendingPolicy) {
        await service.from("entitlements").update({ refund_pending_policy: true }).eq("order_id", order.id);
      }
    }
  }

  await service
    .from("payment_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      process_note: decision.action === "ignore" ? decision.reason : "verified_by_payment_check",
    })
    .eq("delivery_key", deliveryKey);
  return { ok: true as const, duplicate: false, approved: status === "approved", status };
}
