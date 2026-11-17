import { DateTime } from "luxon";
import {
  DASHBOARD_ZONE,
  dayKey,
  enumerateDays,
  formatRangeLabel,
  kpiDelta,
  type DashboardKpi,
  type DashboardRange,
  type DashboardStatusSlice,
} from "@/features/admin/dashboard";
import { formatTokenCount, formatUsd } from "@/lib/formatters";

export const TOKEN_RECENT_LIMIT = 12;
export const TOKEN_HEAVY_ORDERS_LIMIT = 8;

export type LlmPrice = {
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type TokenReadingFact = {
  id: string;
  orderId: string | null;
  model: string;
  createdAt: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usd: number;
};

export type TokenDailyPoint = {
  date: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usd: number;
  readings: number;
  orders: number;
};

export type TokenOrderRow = {
  orderId: string;
  readings: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usd: number;
};

export type TokenModelSlice = {
  model: string;
  readings: number;
  tokens: number;
  usd: number;
};

export type TokensViewModel = {
  configured: boolean;
  canRead: boolean;
  range: DashboardRange;
  rangeLabel: string;
  pricingNote: string;
  configuredModel: string | null;
  kpis: DashboardKpi[];
  extras: Array<{ label: string; value: string }>;
  series: TokenDailyPoint[];
  mix: DashboardStatusSlice[];
  models: TokenModelSlice[];
  heavyOrders: TokenOrderRow[];
  recent: TokenReadingFact[];
  missingUsage: number;
};

const PRICES: Record<string, Omit<LlmPrice, "model">> = {
  "gpt-4.1": { inputPerMillion: 2, outputPerMillion: 8 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-4.1-nano": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
};

const DEFAULT_MODEL = "gpt-4.1";

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function parseTokenUsage(value: unknown): TokenUsage {
  if (!value || typeof value !== "object") return { inputTokens: 0, outputTokens: 0 };
  const row = value as Record<string, unknown>;
  return {
    inputTokens: Math.round(asNumber(row.inputTokens ?? row.input_tokens)),
    outputTokens: Math.round(asNumber(row.outputTokens ?? row.output_tokens)),
  };
}

export function priceForModel(model: string | null | undefined): LlmPrice {
  const key = model?.trim() || DEFAULT_MODEL;
  const listed = PRICES[key] ?? PRICES[DEFAULT_MODEL];
  return { model: PRICES[key] ? key : DEFAULT_MODEL, ...listed };
}

export function estimateUsd(usage: TokenUsage, model?: string | null) {
  const price = priceForModel(model);
  return roundUsd((usage.inputTokens / 1_000_000) * price.inputPerMillion + (usage.outputTokens / 1_000_000) * price.outputPerMillion);
}

export function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function averagePer(total: number, count: number) {
  if (count <= 0) return 0;
  return total / count;
}

export function orderKey(row: { id: string; orderId: string | null }) {
  return row.orderId ?? row.id;
}

export function groupByOrder(rows: TokenReadingFact[]): TokenOrderRow[] {
  const map = new Map<string, TokenOrderRow>();
  for (const row of rows) {
    const id = orderKey(row);
    const current = map.get(id) ?? {
      orderId: id,
      readings: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usd: 0,
    };
    current.readings += 1;
    current.inputTokens += row.inputTokens;
    current.outputTokens += row.outputTokens;
    current.totalTokens += row.totalTokens;
    current.usd = roundUsd(current.usd + row.usd);
    map.set(id, current);
  }
  return [...map.values()].sort((left, right) => right.totalTokens - left.totalTokens);
}

export function buildTokenSeries(input: {
  startIso: string;
  endExclusiveIso: string;
  rows: TokenReadingFact[];
}): TokenDailyPoint[] {
  const days = enumerateDays(input.startIso, input.endExclusiveIso);
  const byDay = new Map<string, TokenDailyPoint>();
  for (const date of days) {
    const dt = DateTime.fromISO(date, { zone: DASHBOARD_ZONE });
    byDay.set(date, {
      date,
      label: dt.toFormat("dd/LL"),
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      usd: 0,
      readings: 0,
      orders: 0,
    });
  }
  const ordersByDay = new Map<string, Set<string>>();
  for (const row of input.rows) {
    const key = dayKey(row.createdAt);
    const point = byDay.get(key);
    if (!point) continue;
    point.inputTokens += row.inputTokens;
    point.outputTokens += row.outputTokens;
    point.totalTokens += row.totalTokens;
    point.usd = roundUsd(point.usd + row.usd);
    point.readings += 1;
    const orders = ordersByDay.get(key) ?? new Set<string>();
    orders.add(orderKey(row));
    ordersByDay.set(key, orders);
  }
  return days.map((date) => {
    const point = byDay.get(date)!;
    point.orders = ordersByDay.get(date)?.size ?? 0;
    return point;
  });
}

export function buildTokenKpis(input: {
  usd: number;
  prevUsd: number;
  tokens: number;
  prevTokens: number;
  tokensPerOrder: number;
  prevTokensPerOrder: number;
  usdPerOrder: number;
  prevUsdPerOrder: number;
  readings: number;
  prevReadings: number;
  series: TokenDailyPoint[];
}): DashboardKpi[] {
  return [
    {
      id: "spend",
      label: "Gasto de IA",
      value: formatUsd(input.usd),
      raw: input.usd,
      deltaPct: kpiDelta(input.usd, input.prevUsd),
      series: input.series.map((point) => point.usd),
    },
    {
      id: "tokens",
      label: "Tokens",
      value: formatTokenCount(input.tokens),
      raw: input.tokens,
      deltaPct: kpiDelta(input.tokens, input.prevTokens),
      series: input.series.map((point) => point.totalTokens),
    },
    {
      id: "per-order",
      label: "Média por pedido",
      value: formatTokenCount(input.tokensPerOrder),
      raw: input.tokensPerOrder,
      deltaPct: kpiDelta(input.tokensPerOrder, input.prevTokensPerOrder),
      series: input.series.map((point) => averagePer(point.totalTokens, point.orders)),
    },
    {
      id: "usd-order",
      label: "US$ por pedido",
      value: formatUsd(input.usdPerOrder),
      raw: input.usdPerOrder,
      deltaPct: kpiDelta(input.usdPerOrder, input.prevUsdPerOrder),
      series: input.series.map((point) => averagePer(point.usd, point.orders)),
    },
    {
      id: "readings",
      label: "Leituras",
      value: String(input.readings),
      raw: input.readings,
      deltaPct: kpiDelta(input.readings, input.prevReadings),
      series: input.series.map((point) => point.readings),
    },
  ];
}

export function buildTokenMix(input: TokenUsage): DashboardStatusSlice[] {
  return [
    { status: "input", label: "Entrada", count: input.inputTokens },
    { status: "output", label: "Saída", count: input.outputTokens },
  ].filter((slice) => slice.count > 0);
}

export function groupByModel(rows: TokenReadingFact[]): TokenModelSlice[] {
  const map = new Map<string, TokenModelSlice>();
  for (const row of rows) {
    const current = map.get(row.model) ?? { model: row.model, readings: 0, tokens: 0, usd: 0 };
    current.readings += 1;
    current.tokens += row.totalTokens;
    current.usd = roundUsd(current.usd + row.usd);
    map.set(row.model, current);
  }
  return [...map.values()].sort((left, right) => right.usd - left.usd);
}

export function pricingNote(models: string[]) {
  const unique = [...new Set(models.map((model) => priceForModel(model).model))];
  const parts = unique.map((model) => {
    const price = priceForModel(model);
    return `${model}: US$ ${price.inputPerMillion} / 1M entrada e US$ ${price.outputPerMillion} / 1M saída`;
  });
  return `Estimativa pela tabela do modelo gravado na leitura. ${parts.join(". ")}.`;
}

export function emptyTokensDashboard(input: {
  configured: boolean;
  canRead: boolean;
  range: DashboardRange;
  configuredModel: string | null;
}): TokensViewModel {
  return {
    ...input,
    rangeLabel: formatRangeLabel(input.range),
    pricingNote: pricingNote(input.configuredModel ? [input.configuredModel] : [DEFAULT_MODEL]),
    kpis: [],
    extras: [],
    series: [],
    mix: [],
    models: [],
    heavyOrders: [],
    recent: [],
    missingUsage: 0,
  };
}
