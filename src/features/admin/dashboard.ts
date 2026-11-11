import { DateTime } from "luxon";
import { formatBrl, maskEmail } from "@/lib/formatters";
import { orderStatusLabel } from "@/features/admin/orders";

export const DASHBOARD_ZONE = "America/Sao_Paulo";
export const MAX_RANGE_DAYS = 90;
export const UNCONVERTED_LIST_LIMIT = 8;
export const RECENT_ERRORS_LIMIT = 10;

export type PeriodPreset = "7d" | "15d" | "mes" | "custom";

export type DashboardRange = {
  preset: PeriodPreset;
  start: string;
  endExclusive: string;
  fromDate: string;
  toDate: string;
};

export type DailyPoint = {
  date: string;
  label: string;
  leads: number;
  orders: number;
  sales: number;
  revenueCents: number;
};

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  raw: number;
  deltaPct: number | null;
  series: number[];
};

export type DashboardLeadRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  city: string | null;
  converted: boolean;
  hasChart: boolean;
};

export type DashboardSaleRow = {
  id: string;
  leadName: string;
  amountCents: number;
  status: string;
  couponCode: string | null;
  createdAt: string;
};

export type DashboardErrorRow = {
  id: string;
  source: "job" | "reading" | "chart" | "email";
  title: string;
  description: string;
  at: string;
  href: string;
};

export type DashboardStatusSlice = {
  status: string;
  label: string;
  count: number;
};

export type DashboardFunnelStep = {
  id: string;
  label: string;
  count: number;
};

export type DashboardViewModel = {
  configured: boolean;
  canRead: boolean;
  greeting: string;
  adminName: string;
  range: DashboardRange;
  rangeLabel: string;
  kpis: DashboardKpi[];
  extras: Array<{ label: string; value: string }>;
  series: DailyPoint[];
  orderStatus: DashboardStatusSlice[];
  funnel: DashboardFunnelStep[];
  latestLeads: DashboardLeadRow[];
  latestSales: DashboardSaleRow[];
  unconverted: { total: number; rows: DashboardLeadRow[] };
  errors: DashboardErrorRow[];
};

const PRESETS = new Set<PeriodPreset>(["7d", "15d", "mes", "custom"]);

const CHART_ERROR: Record<string, string> = {
  house_system_unavailable: "Placidus não está definido nessa latitude. O mapa não foi trocado para signo inteiro.",
  position_unvalidated: "Uma posição ficou fora da faixa validada do motor. Nenhuma leitura foi gerada com ela.",
  body_unavailable: "O motor não devolveu um ponto necessário. Nenhuma posição foi completada por aproximação.",
  sidereal_ayanamsa_unconfigured: "O zodíaco sideral ainda não tem ayanamsa definido. Nenhum deslocamento foi escolhido.",
  worker_http_error: "O motor astronômico não respondeu.",
  worker_invalid_response: "O motor astronômico devolveu uma resposta inválida.",
  invalid_instant: "O instante de nascimento não pôde ser montado.",
  calculation_error: "O cálculo do mapa falhou.",
  fortune_unavailable: "A Parte da Fortuna não pôde ser calculada.",
  no_activations: "O mapa não gerou ativações.",
};

const JOB_KIND_LABEL: Record<string, string> = {
  interpretation: "Interpretação",
  pdf: "PDF",
  email: "E-mail",
};

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function zoneNow(nowIso?: string) {
  if (nowIso) {
    const parsed = DateTime.fromISO(nowIso, { setZone: true }).setZone(DASHBOARD_ZONE);
    if (parsed.isValid) return parsed;
  }
  return DateTime.now().setZone(DASHBOARD_ZONE);
}

function firstGivenName(value: string) {
  return value.trim().split(/\s+/)[0] ?? value.trim();
}

export function adminDisplayName(input: {
  email?: string | null;
  name?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const fromProfile = pickString(input.name);
  if (fromProfile) return firstGivenName(fromProfile);
  const metadata = input.metadata ?? {};
  const fromMeta =
    pickString(metadata.full_name) ?? pickString(metadata.name) ?? pickString(metadata.display_name);
  if (fromMeta) return firstGivenName(fromMeta);
  const local = (input.email ?? "").split("@")[0] ?? "";
  const words = local.replace(/[._+-]+/g, " ").trim();
  if (!words) return "admin";
  const titled = words.replace(/(^|\s)\p{L}/gu, (chunk) => chunk.toUpperCase());
  return firstGivenName(titled);
}

export function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function greetingAt(nowIso?: string) {
  return greetingForHour(zoneNow(nowIso).hour);
}

function isoDate(dt: DateTime) {
  return dt.toISODate() ?? dt.toFormat("yyyy-MM-dd");
}

function asIso(dt: DateTime) {
  return dt.toUTC().toISO() ?? dt.toISO() ?? "";
}

function clampCustom(start: DateTime, endInclusive: DateTime) {
  let from = start.startOf("day");
  let to = endInclusive.startOf("day");
  if (to < from) {
    const swap = from;
    from = to;
    to = swap;
  }
  const maxTo = from.plus({ days: MAX_RANGE_DAYS - 1 });
  if (to > maxTo) to = maxTo;
  return { from, to };
}

export function parseDashboardPeriod(
  params: { periodo?: string; de?: string; ate?: string },
  nowIso?: string,
): DashboardRange {
  const now = zoneNow(nowIso).startOf("minute");
  const today = now.startOf("day");
  const rawPreset = params.periodo && PRESETS.has(params.periodo as PeriodPreset) ? (params.periodo as PeriodPreset) : "mes";

  if (rawPreset === "custom") {
    const fromParsed = DateTime.fromISO(params.de ?? "", { zone: DASHBOARD_ZONE });
    const toParsed = DateTime.fromISO(params.ate ?? "", { zone: DASHBOARD_ZONE });
    if (fromParsed.isValid && toParsed.isValid) {
      const { from, to } = clampCustom(fromParsed, toParsed);
      return {
        preset: "custom",
        start: asIso(from),
        endExclusive: asIso(to.plus({ days: 1 })),
        fromDate: isoDate(from),
        toDate: isoDate(to),
      };
    }
  }

  if (rawPreset === "7d" || rawPreset === "15d") {
    const days = rawPreset === "7d" ? 7 : 15;
    const from = today.minus({ days: days - 1 });
    return {
      preset: rawPreset,
      start: asIso(from),
      endExclusive: asIso(today.plus({ days: 1 })),
      fromDate: isoDate(from),
      toDate: isoDate(today),
    };
  }

  const from = today.startOf("month");
  return {
    preset: "mes",
    start: asIso(from),
    endExclusive: asIso(today.plus({ days: 1 })),
    fromDate: isoDate(from),
    toDate: isoDate(today),
  };
}

export function previousRange(range: DashboardRange): { start: string; endExclusive: string } {
  const start = DateTime.fromISO(range.start, { setZone: true });
  const end = DateTime.fromISO(range.endExclusive, { setZone: true });
  const duration = end.diff(start);
  const prevEnd = start;
  const prevStart = start.minus(duration);
  return { start: asIso(prevStart), endExclusive: asIso(prevEnd) };
}

export function formatRangeLabel(range: DashboardRange) {
  const from = DateTime.fromISO(range.fromDate, { zone: DASHBOARD_ZONE });
  const to = DateTime.fromISO(range.toDate, { zone: DASHBOARD_ZONE });
  const fmt = (dt: DateTime) => dt.toFormat("d LLL yyyy", { locale: "pt-BR" });
  if (range.fromDate === range.toDate) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

export function enumerateDays(startIso: string, endExclusiveIso: string) {
  const days: string[] = [];
  let cursor = DateTime.fromISO(startIso, { setZone: true }).setZone(DASHBOARD_ZONE).startOf("day");
  const end = DateTime.fromISO(endExclusiveIso, { setZone: true }).setZone(DASHBOARD_ZONE);
  while (cursor.isValid && cursor < end) {
    days.push(isoDate(cursor));
    cursor = cursor.plus({ days: 1 });
  }
  return days;
}

export function dayKey(iso: string) {
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(DASHBOARD_ZONE);
  return dt.isValid ? isoDate(dt) : "";
}

export function buildDailySeries(input: {
  startIso: string;
  endExclusiveIso: string;
  leadCreatedAt: string[];
  orderCreatedAt: string[];
  approved: Array<{ createdAt: string; amountCents: number }>;
}): DailyPoint[] {
  const days = enumerateDays(input.startIso, input.endExclusiveIso);
  const leads = new Map<string, number>();
  const orders = new Map<string, number>();
  const sales = new Map<string, number>();
  const revenue = new Map<string, number>();
  for (const stamp of input.leadCreatedAt) {
    const key = dayKey(stamp);
    if (!key) continue;
    leads.set(key, (leads.get(key) ?? 0) + 1);
  }
  for (const stamp of input.orderCreatedAt) {
    const key = dayKey(stamp);
    if (!key) continue;
    orders.set(key, (orders.get(key) ?? 0) + 1);
  }
  for (const row of input.approved) {
    const key = dayKey(row.createdAt);
    if (!key) continue;
    sales.set(key, (sales.get(key) ?? 0) + 1);
    revenue.set(key, (revenue.get(key) ?? 0) + row.amountCents);
  }
  return days.map((date) => {
    const dt = DateTime.fromISO(date, { zone: DASHBOARD_ZONE });
    return {
      date,
      label: dt.toFormat("dd/LL"),
      leads: leads.get(date) ?? 0,
      orders: orders.get(date) ?? 0,
      sales: sales.get(date) ?? 0,
      revenueCents: revenue.get(date) ?? 0,
    };
  });
}

export function kpiDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function conversionRate(sales: number, leads: number) {
  if (leads <= 0) return 0;
  return Math.round((sales / leads) * 1000) / 10;
}

export function averageTicketCents(revenueCents: number, sales: number) {
  if (sales <= 0) return 0;
  return Math.round(revenueCents / sales);
}

export function unconvertedLeadIds(leadIds: string[], approvedLeadIds: Iterable<string>) {
  const paid = new Set(approvedLeadIds);
  return leadIds.filter((id) => !paid.has(id));
}

export function countByStatus(rows: Array<{ status: string }>): DashboardStatusSlice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  const order = ["approved", "pending", "rejected", "cancelled", "refunded"];
  const seen = new Set<string>();
  const slices: DashboardStatusSlice[] = [];
  for (const status of order) {
    const count = counts.get(status) ?? 0;
    if (!count) continue;
    seen.add(status);
    slices.push({ status, label: orderStatusLabel(status), count });
  }
  for (const [status, count] of counts) {
    if (seen.has(status) || !count) continue;
    slices.push({ status, label: orderStatusLabel(status), count });
  }
  return slices;
}

export function formatDeltaPct(delta: number | null) {
  if (delta === null) return "Sem base anterior";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString("pt-BR")}% vs período anterior`;
}

export function formatRelativePt(iso: string, nowIso?: string) {
  const now = zoneNow(nowIso);
  const then = DateTime.fromISO(iso, { setZone: true }).setZone(DASHBOARD_ZONE);
  if (!then.isValid) return iso;
  const minutes = Math.max(0, Math.round(now.diff(then, "minutes").minutes));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return then.toFormat("dd/LL/yyyy");
}

export function describeErrorCode(code: string | null | undefined) {
  const value = code?.trim();
  if (!value) return "Sem detalhe registrado.";
  return CHART_ERROR[value] ?? value.replaceAll("_", " ");
}

export function jobErrorTitle(kind: string, status: string) {
  const label = JOB_KIND_LABEL[kind] ?? kind;
  if (status === "permanent_failed") return `${label} com falha permanente`;
  return `${label} com falha`;
}

export function buildKpis(input: {
  leads: number;
  prevLeads: number;
  sales: number;
  prevSales: number;
  revenueCents: number;
  prevRevenueCents: number;
  unconverted: number;
  prevUnconverted: number;
  series: DailyPoint[];
}): DashboardKpi[] {
  const conversion = conversionRate(input.sales, input.leads);
  const prevConversion = conversionRate(input.prevSales, input.prevLeads);
  return [
    {
      id: "leads",
      label: "Leads",
      value: String(input.leads),
      raw: input.leads,
      deltaPct: kpiDelta(input.leads, input.prevLeads),
      series: input.series.map((point) => point.leads),
    },
    {
      id: "sales",
      label: "Vendas",
      value: String(input.sales),
      raw: input.sales,
      deltaPct: kpiDelta(input.sales, input.prevSales),
      series: input.series.map((point) => point.sales),
    },
    {
      id: "revenue",
      label: "Faturamento",
      value: formatBrl(input.revenueCents),
      raw: input.revenueCents,
      deltaPct: kpiDelta(input.revenueCents, input.prevRevenueCents),
      series: input.series.map((point) => point.revenueCents),
    },
    {
      id: "conversion",
      label: "Conversão",
      value: `${conversion.toLocaleString("pt-BR")}%`,
      raw: conversion,
      deltaPct: kpiDelta(conversion, prevConversion),
      series: input.series.map((point) => conversionRate(point.sales, point.leads)),
    },
    {
      id: "unconverted",
      label: "Sem conversão",
      value: String(input.unconverted),
      raw: input.unconverted,
      deltaPct: kpiDelta(input.unconverted, input.prevUnconverted),
      series: input.series.map((point) => Math.max(0, point.leads - point.sales)),
    },
  ];
}

export function maskLeadRow(row: DashboardLeadRow): DashboardLeadRow {
  return {
    ...row,
    name: "Nome oculto para suporte",
    email: maskEmail(row.email),
  };
}

export function maskSaleRow(row: DashboardSaleRow): DashboardSaleRow {
  return { ...row, leadName: "Nome oculto para suporte" };
}

export function emptyDashboard(input: {
  configured: boolean;
  canRead: boolean;
  greeting: string;
  adminName: string;
  range: DashboardRange;
}): DashboardViewModel {
  return {
    ...input,
    rangeLabel: formatRangeLabel(input.range),
    kpis: [],
    extras: [],
    series: [],
    orderStatus: [],
    funnel: [],
    latestLeads: [],
    latestSales: [],
    unconverted: { total: 0, rows: [] },
    errors: [],
  };
}
