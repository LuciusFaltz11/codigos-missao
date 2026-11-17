import "server-only";
import { formatRangeLabel, previousRange, type DashboardRange } from "@/features/admin/dashboard";
import {
  TOKEN_HEAVY_ORDERS_LIMIT,
  TOKEN_RECENT_LIMIT,
  averagePer,
  buildTokenKpis,
  buildTokenMix,
  buildTokenSeries,
  emptyTokensDashboard,
  estimateUsd,
  groupByModel,
  groupByOrder,
  parseTokenUsage,
  pricingNote,
  type TokenReadingFact,
  type TokensViewModel,
} from "@/features/admin/tokens";
import { formatTokenCount, formatUsd } from "@/lib/formatters";
import { tryServiceClient } from "@/server/db/clients";
import { getServerEnv } from "@/server/env";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function inRange(iso: string | null | undefined, start: string, endExclusive: string) {
  if (!iso) return false;
  const value = Date.parse(iso);
  const from = Date.parse(start);
  const to = Date.parse(endExclusive);
  return Number.isFinite(value) && value >= from && value < to;
}

function toFact(
  row: Record<string, unknown>,
  orderByEntitlement: Map<string, string>,
): { fact: TokenReadingFact | null; missingUsage: boolean } {
  const usage = parseTokenUsage(row.token_usage);
  const totalTokens = usage.inputTokens + usage.outputTokens;
  if (totalTokens <= 0) return { fact: null, missingUsage: true };
  const model = text(row.model) ?? "gpt-4.1";
  const entitlementId = text(row.entitlement_id);
  return {
    missingUsage: false,
    fact: {
      id: String(row.id),
      orderId: entitlementId ? (orderByEntitlement.get(entitlementId) ?? null) : null,
      model,
      createdAt: String(row.created_at ?? ""),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens,
      usd: estimateUsd(usage, model),
    },
  };
}

function totals(rows: TokenReadingFact[]) {
  return rows.reduce(
    (acc, row) => {
      acc.inputTokens += row.inputTokens;
      acc.outputTokens += row.outputTokens;
      acc.totalTokens += row.totalTokens;
      acc.usd += row.usd;
      return acc;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, usd: 0 },
  );
}

export async function loadAdminTokens(input: {
  range: DashboardRange;
  canRead: boolean;
}): Promise<TokensViewModel> {
  const configuredModel = getServerEnv().llmModel ?? null;
  const base = emptyTokensDashboard({
    configured: Boolean(tryServiceClient()),
    canRead: input.canRead,
    range: input.range,
    configuredModel,
  });
  const service = tryServiceClient();
  if (!service || !input.canRead) return { ...base, configured: Boolean(service) };

  const range = input.range;
  const previous = previousRange(range);

  const readingsRes = await service
    .from("readings")
    .select("id,status,token_usage,entitlement_id,model,created_at")
    .eq("status", "completed")
    .gte("created_at", previous.start)
    .lt("created_at", range.endExclusive)
    .order("created_at", { ascending: false })
    .limit(2000);

  const readingRows = readingsRes.data ?? [];
  const entitlementIds = [
    ...new Set(readingRows.map((row) => text(row.entitlement_id)).filter((id): id is string => Boolean(id))),
  ];
  const entitlements = entitlementIds.length
    ? await service.from("entitlements").select("id,order_id").in("id", entitlementIds)
    : { data: [] as Array<Record<string, unknown>> };
  const orderByEntitlement = new Map(
    (entitlements.data ?? [])
      .map((row) => [text(row.id), text(row.order_id)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1])),
  );

  const periodFacts: TokenReadingFact[] = [];
  const prevFacts: TokenReadingFact[] = [];
  let missingUsage = 0;
  for (const row of readingRows) {
    const createdAt = text(row.created_at);
    const inPeriod = inRange(createdAt, range.start, range.endExclusive);
    const inPrev = inRange(createdAt, previous.start, previous.endExclusive);
    const parsed = toFact(row, orderByEntitlement);
    if (inPeriod && parsed.missingUsage) missingUsage += 1;
    if (!parsed.fact) continue;
    if (inPeriod) periodFacts.push(parsed.fact);
    if (inPrev) prevFacts.push(parsed.fact);
  }

  const series = buildTokenSeries({
    startIso: range.start,
    endExclusiveIso: range.endExclusive,
    rows: periodFacts,
  });
  const current = totals(periodFacts);
  const previousTotals = totals(prevFacts);
  const orders = groupByOrder(periodFacts);
  const prevOrders = groupByOrder(prevFacts);
  const tokensPerOrder = averagePer(current.totalTokens, orders.length);
  const prevTokensPerOrder = averagePer(previousTotals.totalTokens, prevOrders.length);
  const usdPerOrder = averagePer(current.usd, orders.length);
  const prevUsdPerOrder = averagePer(previousTotals.usd, prevOrders.length);
  const tokensPerReading = averagePer(current.totalTokens, periodFacts.length);
  const usdPerReading = averagePer(current.usd, periodFacts.length);
  const models = groupByModel(periodFacts);

  return {
    configured: true,
    canRead: true,
    range,
    rangeLabel: formatRangeLabel(range),
    pricingNote: pricingNote(models.length ? models.map((item) => item.model) : configuredModel ? [configuredModel] : ["gpt-4.1"]),
    configuredModel,
    kpis: buildTokenKpis({
      usd: current.usd,
      prevUsd: previousTotals.usd,
      tokens: current.totalTokens,
      prevTokens: previousTotals.totalTokens,
      tokensPerOrder,
      prevTokensPerOrder,
      usdPerOrder,
      prevUsdPerOrder,
      readings: periodFacts.length,
      prevReadings: prevFacts.length,
      series,
    }),
    extras: [
      { label: "Entrada", value: formatTokenCount(current.inputTokens) },
      { label: "Saída", value: formatTokenCount(current.outputTokens) },
      { label: "Média por leitura", value: formatTokenCount(tokensPerReading) },
      { label: "US$ por leitura", value: formatUsd(usdPerReading) },
      { label: "Pedidos com leitura", value: String(orders.length) },
      { label: "Modelo", value: configuredModel ?? models[0]?.model ?? "gpt-4.1" },
    ],
    series,
    mix: buildTokenMix(current),
    models,
    heavyOrders: orders.slice(0, TOKEN_HEAVY_ORDERS_LIMIT),
    recent: periodFacts.slice(0, TOKEN_RECENT_LIMIT),
    missingUsage,
  };
}
