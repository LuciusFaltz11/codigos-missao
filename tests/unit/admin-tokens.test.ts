import { describe, expect, it } from "vitest";
import { parseDashboardPeriod } from "@/features/admin/dashboard";
import {
  averagePer,
  buildTokenKpis,
  buildTokenSeries,
  estimateUsd,
  groupByOrder,
  parseTokenUsage,
  priceForModel,
} from "@/features/admin/tokens";
import { formatTokenCount, formatUsd } from "@/lib/formatters";

const NOW = "2026-11-17T08:16:00-03:00";

describe("tokens do admin", () => {
  it("lê inputTokens e outputTokens do JSON gravado", () => {
    expect(parseTokenUsage({ inputTokens: 230000, outputTokens: 57500 })).toEqual({
      inputTokens: 230000,
      outputTokens: 57500,
    });
    expect(parseTokenUsage({ input_tokens: 10, output_tokens: 4 })).toEqual({
      inputTokens: 10,
      outputTokens: 4,
    });
    expect(parseTokenUsage(null)).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("estima o gasto do gpt-4.1 com a tabela oficial", () => {
    expect(priceForModel("gpt-4.1")).toMatchObject({ inputPerMillion: 2, outputPerMillion: 8 });
    expect(estimateUsd({ inputTokens: 230_000, outputTokens: 57_500 }, "gpt-4.1")).toBe(0.92);
    expect(estimateUsd({ inputTokens: 16 * 14_375, outputTokens: 16 * 3_593.75 }, "gpt-4.1")).toBeCloseTo(0.92, 4);
  });

  it("calcula a média de tokens por pedido, somando reprocessamentos", () => {
    const rows = [
      fact("r1", "ord-a", 10_000, 2_000),
      fact("r2", "ord-a", 4_000, 1_000),
      fact("r3", "ord-b", 8_000, 2_000),
    ];
    const orders = groupByOrder(rows);
    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({ orderId: "ord-a", readings: 2, totalTokens: 17_000 });
    const tokens = rows.reduce((sum, row) => sum + row.totalTokens, 0);
    expect(averagePer(tokens, orders.length)).toBe(13_500);
  });

  it("reproduz 16 leituras a US$ 0,92 como ~18 mil tokens por pedido", () => {
    const rows = Array.from({ length: 16 }, (_, index) =>
      fact(`r${index}`, `ord-${index}`, 14_375, 3_594, "2026-11-11T12:00:00-03:00"),
    );
    const tokens = rows.reduce((sum, row) => sum + row.totalTokens, 0);
    const usd = rows.reduce((sum, row) => sum + row.usd, 0);
    expect(averagePer(tokens, rows.length)).toBe(17_969);
    expect(usd).toBeCloseTo(0.92, 2);
    expect(formatUsd(usd).replace(/\s/g, " ")).toBe("US$ 0,92");
    expect(formatTokenCount(averagePer(tokens, rows.length))).toBe("17.969");
  });

  it("agrupa o uso por dia e monta os KPIs do período", () => {
    const range = parseDashboardPeriod({ periodo: "7d" }, NOW);
    const series = buildTokenSeries({
      startIso: range.start,
      endExclusiveIso: range.endExclusive,
      rows: [
        fact("r1", "ord-1", 1000, 200, "2026-11-17T10:00:00-03:00"),
        fact("r2", "ord-2", 3000, 400, "2026-11-17T11:00:00-03:00"),
      ],
    });
    expect(series).toHaveLength(7);
    const today = series.find((point) => point.date === "2026-11-17");
    expect(today).toMatchObject({ readings: 2, orders: 2, totalTokens: 4600 });
    const kpis = buildTokenKpis({
      usd: 0.92,
      prevUsd: 0.46,
      tokens: 287_500,
      prevTokens: 140_000,
      tokensPerOrder: 17_969,
      prevTokensPerOrder: 17_500,
      usdPerOrder: 0.0575,
      prevUsdPerOrder: 0.05,
      readings: 16,
      prevReadings: 8,
      series,
    });
    expect(kpis.find((item) => item.id === "spend")?.value?.replace(/\s/g, " ")).toBe("US$ 0,92");
    expect(kpis.find((item) => item.id === "per-order")?.value).toBe("17.969");
  });
});

function fact(
  id: string,
  orderId: string,
  inputTokens: number,
  outputTokens: number,
  createdAt = "2026-11-17T10:00:00-03:00",
) {
  return {
    id,
    orderId,
    model: "gpt-4.1",
    createdAt,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    usd: estimateUsd({ inputTokens, outputTokens }, "gpt-4.1"),
  };
}
