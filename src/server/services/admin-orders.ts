import "server-only";
import type { AdminOrder, AdminOrderEmail, AdminOrderPayment } from "@/features/admin/orders";
import { tryServiceClient } from "@/server/db/clients";

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadAdminOrders(): Promise<AdminOrder[]> {
  const service = tryServiceClient();
  if (!service) return [];
  const orders = await service.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
  const rows = orders.data ?? [];
  if (rows.length === 0) return [];

  const orderIds = rows.map((row) => String(row.id));
  const leadIds = unique(rows.map((row) => text(row.lead_id)));
  const productIds = unique(rows.map((row) => text(row.product_id)));
  const couponIds = unique(rows.map((row) => text(row.coupon_id)));

  const [leads, products, coupons, payments, entitlements] = await Promise.all([
    leadIds.length ? service.from("leads").select("id,name,email").in("id", leadIds) : { data: [] },
    productIds.length ? service.from("products").select("id,name,price_cents").in("id", productIds) : { data: [] },
    couponIds.length
      ? service.from("coupons").select("id,name,code,kind,percent,amount_cents").in("id", couponIds)
      : { data: [] },
    service
      .from("payments")
      .select("id,order_id,provider,provider_payment_id,status,amount_cents,currency,created_at")
      .in("order_id", orderIds),
    service
      .from("entitlements")
      .select("id,order_id,granted_at,revoked_at,refund_pending_policy")
      .in("order_id", orderIds),
  ]);

  const entitlementRows = entitlements.data ?? [];
  const entitlementIds = entitlementRows.map((row) => String(row.id));
  const readings = entitlementIds.length
    ? await service
        .from("readings")
        .select("id,entitlement_id,status,prompt_version,model,last_error,created_at")
        .in("entitlement_id", entitlementIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const readingRows = readings.data ?? [];
  const readingIds = readingRows.map((row) => String(row.id));
  const reports = readingIds.length
    ? await service
        .from("reports")
        .select("id,reading_id,status,storage_path,created_at")
        .in("reading_id", readingIds)
    : { data: [] };
  const reportRows = reports.data ?? [];
  const reportIds = reportRows.map((row) => String(row.id));
  const emails = reportIds.length
    ? await service
        .from("email_deliveries")
        .select("id,report_id,status,provider_id,last_error,created_at")
        .in("report_id", reportIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const leadById = new Map((leads.data ?? []).map((row) => [String(row.id), row]));
  const productById = new Map((products.data ?? []).map((row) => [String(row.id), row]));
  const couponById = new Map((coupons.data ?? []).map((row) => [String(row.id), row]));
  const paymentsByOrder = new Map<string, AdminOrderPayment[]>();
  for (const row of payments.data ?? []) {
    const orderId = String(row.order_id);
    const list = paymentsByOrder.get(orderId) ?? [];
    list.push({
      id: String(row.id),
      provider: String(row.provider),
      providerPaymentId: String(row.provider_payment_id),
      status: String(row.status),
      amountCents: Number(row.amount_cents),
      currency: String(row.currency),
      createdAt: String(row.created_at),
    });
    paymentsByOrder.set(orderId, list);
  }
  const entitlementByOrder = new Map(entitlementRows.map((row) => [String(row.order_id), row]));
  const readingByEntitlement = new Map<string, (typeof readingRows)[number]>();
  for (const row of readingRows) {
    const key = String(row.entitlement_id);
    if (!readingByEntitlement.has(key)) readingByEntitlement.set(key, row);
  }
  const reportByReading = new Map(reportRows.map((row) => [String(row.reading_id), row]));
  const emailsByReport = new Map<string, AdminOrderEmail[]>();
  for (const row of emails.data ?? []) {
    const reportId = String(row.report_id);
    const list = emailsByReport.get(reportId) ?? [];
    list.push({
      id: String(row.id),
      status: String(row.status),
      providerId: text(row.provider_id),
      lastError: text(row.last_error),
      createdAt: String(row.created_at),
    });
    emailsByReport.set(reportId, list);
  }

  return rows.map((row) => {
    const lead = leadById.get(String(row.lead_id));
    const product = productById.get(String(row.product_id));
    const coupon = row.coupon_id ? couponById.get(String(row.coupon_id)) : undefined;
    const amountCents = Number(row.amount_cents);
    const discountCents = Number(row.discount_cents ?? 0);
    const entitlement = entitlementByOrder.get(String(row.id));
    const reading = entitlement ? readingByEntitlement.get(String(entitlement.id)) : undefined;
    const report = reading ? reportByReading.get(String(reading.id)) : undefined;
    return {
      id: String(row.id),
      status: String(row.status),
      amountCents,
      currency: String(row.currency ?? "BRL"),
      discountCents,
      originalCents: amountCents + discountCents,
      couponId: text(row.coupon_id),
      couponCode: text(row.coupon_code) ?? text(coupon?.code),
      couponName: text(coupon?.name),
      couponKind: text(coupon?.kind),
      couponPercent: coupon?.percent == null ? null : Number(coupon.percent),
      couponAmountCents: coupon?.amount_cents == null ? null : Number(coupon.amount_cents),
      externalReference: String(row.external_reference),
      preferenceId: text(row.preference_id),
      initPoint: text(row.init_point),
      leadId: String(row.lead_id),
      leadName: text(lead?.name) ?? "Lead sem nome",
      leadEmail: text(lead?.email) ?? "—",
      chartId: String(row.chart_id),
      productId: String(row.product_id),
      productName: text(product?.name),
      productPriceCents: product?.price_cents == null ? null : Number(product.price_cents),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at ?? row.created_at),
      payments: paymentsByOrder.get(String(row.id)) ?? [],
      entitlement: entitlement
        ? {
            id: String(entitlement.id),
            grantedAt: String(entitlement.granted_at),
            revokedAt: text(entitlement.revoked_at),
            refundPendingPolicy: Boolean(entitlement.refund_pending_policy),
          }
        : null,
      reading: reading
        ? {
            id: String(reading.id),
            status: String(reading.status),
            promptVersion: String(reading.prompt_version),
            model: text(reading.model),
            lastError: text(reading.last_error),
            createdAt: String(reading.created_at),
          }
        : null,
      report: report
        ? {
            id: String(report.id),
            status: String(report.status),
            storagePath: text(report.storage_path),
            createdAt: String(report.created_at),
          }
        : null,
      emails: report ? (emailsByReport.get(String(report.id)) ?? []) : [],
    };
  });
}
