import "server-only";
import { decidePaymentTransition, type InfinitePayEvent, type PaymentStatus, type ProviderPayment } from "@/features/checkout/transition";
import { PROMPT_VERSION } from "@/features/interpretation/prompts";
import { tryServiceClient } from "@/server/db/clients";
import { logEvent } from "@/server/logging";
import { checkPayment } from "@/server/providers/infinitepay";

export async function recordAndProcessPayment(input: {
  orderNsu: string;
  transactionNsu: string;
  slug: string | null;
  event: InfinitePayEvent | null;
}) {
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
    if (existing.data?.processed_at) return { ok: true as const, duplicate: true };
  }

  const order = await service
    .from("orders")
    .select("id,external_reference,amount_cents,currency,status,chart_id,lead_id,preference_id")
    .eq("external_reference", input.orderNsu)
    .maybeSingle();
  if (!order.data) {
    await service.from("payment_webhook_events").update({ process_note: "order_not_found" }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false };
  }

  const slug = input.slug ?? (order.data.preference_id ? String(order.data.preference_id) : null);
  if (input.slug && input.slug !== order.data.preference_id) {
    await service.from("orders").update({ preference_id: input.slug }).eq("id", order.data.id);
  }
  if (!slug) {
    await service.from("payment_webhook_events").update({ process_note: "missing_slug" }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false };
  }

  let checked;
  try {
    checked = await checkPayment({
      orderNsu: input.orderNsu,
      transactionNsu: input.transactionNsu,
      slug,
    });
  } catch (error) {
    logEvent("error", "payment_check_failed", { code: error instanceof Error ? error.message : "payment_check_failed" });
    return { ok: false as const, httpStatus: 400 };
  }

  const amountCents = checked.paid ? checked.amountCents : (checked.amountCents ?? Number(order.data.amount_cents));
  if (amountCents === null) {
    await service.from("payment_webhook_events").update({ process_note: "missing_amount" }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false };
  }

  const payment: ProviderPayment = {
    id: input.transactionNsu,
    paid: checked.paid,
    amountCents,
    currencyId: "BRL",
    externalReference: input.orderNsu,
    event: input.event,
  };

  const entitlement = await service.from("entitlements").select("id").eq("order_id", order.data.id).maybeSingle();
  const decision = decidePaymentTransition(
    {
      externalReference: String(order.data.external_reference),
      amountCents: Number(order.data.amount_cents),
      currency: String(order.data.currency),
      status: String(order.data.status) as PaymentStatus,
      hasEntitlement: Boolean(entitlement.data),
    },
    payment,
  );

  if (decision.action === "reject_mismatch") {
    await service.from("audit_logs").insert({
      actor_id: null,
      action: "payment_mismatch",
      entity: "orders",
      entity_id: String(order.data.id),
      metadata: { reason: decision.reason, provider_payment_id: payment.id },
    });
    await service.from("payment_webhook_events").update({ process_note: decision.reason }).eq("delivery_key", deliveryKey);
    return { ok: true as const, duplicate: false };
  }

  if (decision.action === "update") {
    await service.from("payments").upsert(
      {
        order_id: order.data.id,
        provider: "infinitepay",
        provider_payment_id: payment.id,
        status: decision.nextStatus,
        amount_cents: Number(order.data.amount_cents),
        currency: String(order.data.currency),
      },
      { onConflict: "provider,provider_payment_id" },
    );
    await service.from("orders").update({ status: decision.nextStatus }).eq("id", order.data.id);
    if (decision.grantEntitlement) {
      const granted = await service
        .from("entitlements")
        .insert({ order_id: order.data.id, chart_id: order.data.chart_id, lead_id: order.data.lead_id })
        .select("id")
        .maybeSingle();
      if (granted.data) {
        await service.from("jobs").insert({
          kind: "interpretation",
          idempotency_key: `interpretation:${granted.data.id}:${PROMPT_VERSION}`,
          status: "queued",
          payload: { entitlementId: granted.data.id, chartId: order.data.chart_id },
          next_run_at: new Date().toISOString(),
        });
        await service.from("analytics_events").insert({
          name: "payment_approved",
          order_id: order.data.id,
          chart_id: order.data.chart_id,
          properties: {},
        });
      }
    }
    if (decision.refundPendingPolicy) {
      await service.from("entitlements").update({ refund_pending_policy: true }).eq("order_id", order.data.id);
    }
  }

  await service
    .from("payment_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      process_note: decision.action === "ignore" ? decision.reason : "verified_by_payment_check",
    })
    .eq("delivery_key", deliveryKey);
  return { ok: true as const, duplicate: false };
}
