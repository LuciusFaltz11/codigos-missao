import "server-only";
import { formatBrl } from "@/lib/formatters";
import {
  UNCONVERTED_LIST_LIMIT,
  RECENT_ERRORS_LIMIT,
  averageTicketCents,
  buildDailySeries,
  buildKpis,
  countByStatus,
  describeErrorCode,
  emptyDashboard,
  formatRangeLabel,
  jobErrorTitle,
  previousRange,
  unconvertedLeadIds,
  type DashboardErrorRow,
  type DashboardLeadRow,
  type DashboardRange,
  type DashboardSaleRow,
  type DashboardViewModel,
} from "@/features/admin/dashboard";
import { tryServiceClient } from "@/server/db/clients";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function inRange(iso: string | null | undefined, start: string, endExclusive: string) {
  if (!iso) return false;
  const value = Date.parse(iso);
  const from = Date.parse(start);
  const to = Date.parse(endExclusive);
  return Number.isFinite(value) && value >= from && value < to;
}

export async function loadAdminDashboard(input: {
  range: DashboardRange;
  greeting: string;
  adminName: string;
  canRead: boolean;
}): Promise<DashboardViewModel> {
  const base = emptyDashboard({
    configured: Boolean(tryServiceClient()),
    canRead: input.canRead,
    greeting: input.greeting,
    adminName: input.adminName,
    range: input.range,
  });
  const service = tryServiceClient();
  if (!service || !input.canRead) return { ...base, configured: Boolean(service) };

  const range = input.range;
  const previous = previousRange(range);
  const seriesStart = previous.start;

  const [
    seriesLeads,
    seriesOrders,
    latestLeadsRes,
    latestOrdersRes,
    failedJobsPeriod,
    failedChartsPeriod,
    pendingOrdersPeriod,
    reportsReady,
    emailsSent,
    jobErrors,
    readingErrors,
    chartErrors,
    emailErrors,
  ] = await Promise.all([
    service
      .from("leads")
      .select("id,name,email,created_at")
      .gte("created_at", seriesStart)
      .lt("created_at", range.endExclusive)
      .order("created_at", { ascending: false }),
    service
      .from("orders")
      .select("id,lead_id,status,amount_cents,coupon_code,created_at")
      .gte("created_at", seriesStart)
      .lt("created_at", range.endExclusive)
      .order("created_at", { ascending: false }),
    service.from("leads").select("id,name,email,created_at").order("created_at", { ascending: false }).limit(5),
    service
      .from("orders")
      .select("id,lead_id,status,amount_cents,coupon_code,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    service
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["retryable_failed", "permanent_failed"])
      .gte("updated_at", range.start)
      .lt("updated_at", range.endExclusive),
    service
      .from("natal_charts")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", range.start)
      .lt("created_at", range.endExclusive),
    service
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", range.start)
      .lt("created_at", range.endExclusive),
    service
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "ready")
      .gte("created_at", range.start)
      .lt("created_at", range.endExclusive),
    service
      .from("email_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", range.start)
      .lt("created_at", range.endExclusive),
    service
      .from("jobs")
      .select("id,kind,status,last_error,updated_at")
      .in("status", ["retryable_failed", "permanent_failed"])
      .order("updated_at", { ascending: false })
      .limit(RECENT_ERRORS_LIMIT),
    service
      .from("readings")
      .select("id,status,last_error,chart_id,updated_at")
      .not("last_error", "is", null)
      .order("updated_at", { ascending: false })
      .limit(RECENT_ERRORS_LIMIT),
    service
      .from("natal_charts")
      .select("id,status,error_code,created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(RECENT_ERRORS_LIMIT),
    service
      .from("email_deliveries")
      .select("id,status,last_error,created_at")
      .neq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(RECENT_ERRORS_LIMIT),
  ]);

  const leadRows = seriesLeads.data ?? [];
  const orderRows = seriesOrders.data ?? [];
  const periodLeads = leadRows.filter((row) => inRange(text(row.created_at), range.start, range.endExclusive));
  const prevLeads = leadRows.filter((row) => inRange(text(row.created_at), previous.start, previous.endExclusive));
  const periodOrders = orderRows.filter((row) => inRange(text(row.created_at), range.start, range.endExclusive));
  const prevOrders = orderRows.filter((row) => inRange(text(row.created_at), previous.start, previous.endExclusive));
  const periodApproved = periodOrders.filter((row) => row.status === "approved");
  const prevApproved = prevOrders.filter((row) => row.status === "approved");

  const latestLeadRows = latestLeadsRes.data ?? [];
  const latestOrderRows = latestOrdersRes.data ?? [];
  const lookupLeadIds = unique([
    ...periodLeads.map((row) => text(row.id)),
    ...prevLeads.map((row) => text(row.id)),
    ...latestLeadRows.map((row) => text(row.id)),
    ...latestOrderRows.map((row) => text(row.lead_id)),
    ...periodOrders.map((row) => text(row.lead_id)),
  ]);

  const [births, approvedForLeads, saleLeads] = await Promise.all([
    lookupLeadIds.length
      ? service.from("birth_records").select("id,lead_id,city_label").in("lead_id", lookupLeadIds)
      : { data: [] as Array<Record<string, unknown>> },
    lookupLeadIds.length
      ? service.from("orders").select("lead_id").eq("status", "approved").in("lead_id", lookupLeadIds)
      : { data: [] as Array<Record<string, unknown>> },
    unique(latestOrderRows.map((row) => text(row.lead_id))).length
      ? service
          .from("leads")
          .select("id,name")
          .in("id", unique(latestOrderRows.map((row) => text(row.lead_id))))
      : { data: [] as Array<Record<string, unknown>> },
  ]);

  const birthRows = births.data ?? [];
  const birthIds = unique(birthRows.map((row) => text(row.id)));
  const charts = birthIds.length
    ? await service.from("natal_charts").select("id,birth_record_id,status").in("birth_record_id", birthIds)
    : { data: [] as Array<Record<string, unknown>> };

  const cityByLead = new Map<string, string>();
  const birthsByLead = new Map<string, string[]>();
  for (const row of birthRows) {
    const leadId = text(row.lead_id);
    const birthId = text(row.id);
    if (!leadId) continue;
    const city = text(row.city_label);
    if (city && !cityByLead.has(leadId)) cityByLead.set(leadId, city);
    if (birthId) birthsByLead.set(leadId, [...(birthsByLead.get(leadId) ?? []), birthId]);
  }
  const chartBirths = new Set((charts.data ?? []).map((row) => text(row.birth_record_id)).filter(Boolean) as string[]);
  const leadsWithChart = new Set<string>();
  for (const [leadId, ids] of birthsByLead) {
    if (ids.some((id) => chartBirths.has(id))) leadsWithChart.add(leadId);
  }
  const approvedLeadIds = new Set(
    (approvedForLeads.data ?? []).map((row) => text(row.lead_id)).filter(Boolean) as string[],
  );
  const saleNameByLead = new Map((saleLeads.data ?? []).map((row) => [String(row.id), text(row.name) ?? "Lead sem nome"]));

  const series = buildDailySeries({
    startIso: range.start,
    endExclusiveIso: range.endExclusive,
    leadCreatedAt: periodLeads.map((row) => String(row.created_at)),
    orderCreatedAt: periodOrders.map((row) => String(row.created_at)),
    approved: periodApproved.map((row) => ({
      createdAt: String(row.created_at),
      amountCents: num(row.amount_cents),
    })),
  });

  const revenueCents = periodApproved.reduce((sum, row) => sum + num(row.amount_cents), 0);
  const prevRevenueCents = prevApproved.reduce((sum, row) => sum + num(row.amount_cents), 0);
  const unconvertedIds = unconvertedLeadIds(
    periodLeads.map((row) => String(row.id)),
    approvedLeadIds,
  );
  const prevUnconverted = unconvertedLeadIds(
    prevLeads.map((row) => String(row.id)),
    approvedLeadIds,
  ).length;

  function toLeadRow(row: Record<string, unknown>): DashboardLeadRow {
    const id = String(row.id);
    return {
      id,
      name: text(row.name) ?? "Lead sem nome",
      email: text(row.email) ?? "",
      createdAt: String(row.created_at ?? ""),
      city: cityByLead.get(id) ?? null,
      converted: approvedLeadIds.has(id),
      hasChart: leadsWithChart.has(id),
    };
  }

  const unconvertedRows = periodLeads
    .filter((row) => unconvertedIds.includes(String(row.id)))
    .map((row) => toLeadRow(row))
    .slice(0, UNCONVERTED_LIST_LIMIT);

  const latestLeads: DashboardLeadRow[] = latestLeadRows.map((row) => toLeadRow(row));
  const latestSales: DashboardSaleRow[] = latestOrderRows.map((row) => ({
    id: String(row.id),
    leadName: saleNameByLead.get(String(row.lead_id)) ?? "Lead sem nome",
    amountCents: num(row.amount_cents),
    status: String(row.status),
    couponCode: text(row.coupon_code),
    createdAt: String(row.created_at ?? ""),
  }));

  const mapsCount = periodLeads.filter((row) => leadsWithChart.has(String(row.id))).length;
  const kpis = buildKpis({
    leads: periodLeads.length,
    prevLeads: prevLeads.length,
    sales: periodApproved.length,
    prevSales: prevApproved.length,
    revenueCents,
    prevRevenueCents,
    unconverted: unconvertedIds.length,
    prevUnconverted,
    series,
  });

  const extras = [
    { label: "Ticket médio", value: periodApproved.length ? formatBrl(averageTicketCents(revenueCents, periodApproved.length)) : "—" },
    { label: "Pedidos pendentes", value: String(pendingOrdersPeriod.count ?? 0) },
    { label: "Mapas falhos", value: String(failedChartsPeriod.count ?? 0) },
    { label: "Jobs em falha", value: String(failedJobsPeriod.count ?? 0) },
  ];

  const errors: DashboardErrorRow[] = [
    ...(jobErrors.data ?? []).map((row) => ({
      id: `job-${row.id}`,
      source: "job" as const,
      title: jobErrorTitle(String(row.kind), String(row.status)),
      description: describeErrorCode(text(row.last_error)),
      at: String(row.updated_at ?? ""),
      href: "/admin/relatorios",
    })),
    ...(readingErrors.data ?? []).map((row) => ({
      id: `reading-${row.id}`,
      source: "reading" as const,
      title: "Leitura com erro",
      description: describeErrorCode(text(row.last_error)),
      at: String(row.updated_at ?? ""),
      href: "/admin/relatorios",
    })),
    ...(chartErrors.data ?? []).map((row) => ({
      id: `chart-${row.id}`,
      source: "chart" as const,
      title: "Mapa falhou",
      description: describeErrorCode(text(row.error_code)),
      at: String(row.created_at ?? ""),
      href: "/admin/mapas",
    })),
    ...(emailErrors.data ?? []).map((row) => ({
      id: `email-${row.id}`,
      source: "email" as const,
      title: "E-mail não enviado",
      description: describeErrorCode(text(row.last_error)),
      at: String(row.created_at ?? ""),
      href: "/admin/relatorios",
    })),
  ]
    .sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0))
    .slice(0, RECENT_ERRORS_LIMIT);

  return {
    configured: true,
    canRead: true,
    greeting: input.greeting,
    adminName: input.adminName,
    range,
    rangeLabel: formatRangeLabel(range),
    kpis,
    extras,
    series,
    orderStatus: countByStatus(periodOrders.map((row) => ({ status: String(row.status) }))),
    funnel: [
      { id: "leads", label: "Leads", count: periodLeads.length },
      { id: "maps", label: "Mapas", count: mapsCount },
      { id: "orders", label: "Pedidos", count: periodOrders.length },
      { id: "paid", label: "Pagos", count: periodApproved.length },
      { id: "pdf", label: "PDF / e-mail", count: Number(emailsSent.count ?? 0) || Number(reportsReady.count ?? 0) },
    ],
    latestLeads,
    latestSales,
    unconverted: { total: unconvertedIds.length, rows: unconvertedRows },
    errors,
  };
}
