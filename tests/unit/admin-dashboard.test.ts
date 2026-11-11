import { describe, expect, it } from "vitest";
import {
  adminDisplayName,
  buildDailySeries,
  buildKpis,
  conversionRate,
  greetingForHour,
  greetingAt,
  kpiDelta,
  maskLeadRow,
  parseDashboardPeriod,
  previousRange,
  unconvertedLeadIds,
} from "@/features/admin/dashboard";

const NOW = "2026-11-11T15:42:00-03:00";

describe("dashboard do admin", () => {
  it("saúda conforme o horário de Brasília", () => {
    expect(greetingForHour(4)).toBe("Boa noite");
    expect(greetingForHour(5)).toBe("Bom dia");
    expect(greetingForHour(11)).toBe("Bom dia");
    expect(greetingForHour(12)).toBe("Boa tarde");
    expect(greetingForHour(17)).toBe("Boa tarde");
    expect(greetingForHour(18)).toBe("Boa noite");
    expect(greetingAt(NOW)).toBe("Boa tarde");
    expect(greetingAt("2026-11-11T04:10:00-03:00")).toBe("Boa noite");
  });

  it("usa o primeiro nome do admin ou o e-mail", () => {
    expect(adminDisplayName({ email: "lucius@valwilges.com.br", name: "Lucius Faltz" })).toBe("Lucius");
    expect(adminDisplayName({ email: "lucius@valwilges.com.br", metadata: { full_name: "Lucius Faltz" } })).toBe("Lucius");
    expect(adminDisplayName({ email: "lucius.faltz@valwilges.com.br" })).toBe("Lucius");
    expect(adminDisplayName({})).toBe("admin");
  });

  it("monta 7 dias, 15 dias, mês e personalizado", () => {
    const week = parseDashboardPeriod({ periodo: "7d" }, NOW);
    expect(week.preset).toBe("7d");
    expect(week.fromDate).toBe("2026-11-05");
    expect(week.toDate).toBe("2026-11-11");

    const fortnight = parseDashboardPeriod({ periodo: "15d" }, NOW);
    expect(fortnight.fromDate).toBe("2026-10-28");
    expect(fortnight.toDate).toBe("2026-11-11");

    const month = parseDashboardPeriod({}, NOW);
    expect(month.preset).toBe("mes");
    expect(month.fromDate).toBe("2026-11-01");
    expect(month.toDate).toBe("2026-11-11");

    const custom = parseDashboardPeriod({ periodo: "custom", de: "2026-01-01", ate: "2026-12-31" }, NOW);
    expect(custom.preset).toBe("custom");
    expect(custom.fromDate).toBe("2026-01-01");
    expect(custom.toDate).toBe("2026-03-31");
  });

  it("compara com o período anterior da mesma duração", () => {
    const range = parseDashboardPeriod({ periodo: "7d" }, NOW);
    const previous = previousRange(range);
    expect(previous.endExclusive).toBe(range.start);
  });

  it("agrupa leads e vendas por dia", () => {
    const range = parseDashboardPeriod({ periodo: "7d" }, NOW);
    const series = buildDailySeries({
      startIso: range.start,
      endExclusiveIso: range.endExclusive,
      leadCreatedAt: ["2026-11-11T10:00:00-03:00", "2026-11-11T18:00:00-03:00", "2026-11-10T09:00:00-03:00"],
      orderCreatedAt: ["2026-11-11T12:00:00-03:00"],
      approved: [{ createdAt: "2026-11-11T12:00:00-03:00", amountCents: 9700 }],
    });
    expect(series).toHaveLength(7);
    const eleventh = series.find((point) => point.date === "2026-11-11");
    expect(eleventh).toMatchObject({ leads: 2, orders: 1, sales: 1, revenueCents: 9700 });
  });

  it("calcula conversão, delta e leads sem compra", () => {
    expect(conversionRate(2, 8)).toBe(25);
    expect(kpiDelta(12, 10)).toBe(20);
    expect(kpiDelta(5, 0)).toBe(100);
    expect(kpiDelta(0, 0)).toBeNull();
    expect(unconvertedLeadIds(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
    const kpis = buildKpis({
      leads: 8,
      prevLeads: 4,
      sales: 2,
      prevSales: 1,
      revenueCents: 19400,
      prevRevenueCents: 9700,
      unconverted: 6,
      prevUnconverted: 3,
      series: [],
    });
    expect(kpis.find((item) => item.id === "conversion")?.value).toBe("25%");
    expect(kpis.find((item) => item.id === "unconverted")?.raw).toBe(6);
  });

  it("mascara nome e e-mail para suporte", () => {
    const masked = maskLeadRow({
      id: "1",
      name: "Ana Silva",
      email: "ana@example.com",
      createdAt: NOW,
      city: "Porto Alegre",
      converted: false,
      hasChart: true,
    });
    expect(masked.name).toBe("Nome oculto para suporte");
    expect(masked.email).toBe("a***@example.com");
  });
});
