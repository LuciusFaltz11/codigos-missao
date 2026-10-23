import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Engine, fmtLon, type Chart } from "caelus";
import { embeddedData } from "caelus/data-embedded";
import { houseNumberForLongitude, wholeSignHouse } from "@/features/astrology/houses";
import { normalizeLongitude, signFromLongitude } from "@/features/astrology/longitude";
import { resolveLocalDateTime } from "@/features/astrology/time";
import { decanFromDegree, activatePositions } from "@/features/missions/activate";
import { officialCatalog } from "@/features/missions/catalog";

const engine = new Engine(embeddedData);

const SIGN_INDEX: Record<string, number> = {
  Aries: 0,
  Taurus: 1,
  Gemini: 2,
  Cancer: 3,
  Leo: 4,
  Virgo: 5,
  Libra: 6,
  Scorpio: 7,
  Sagittarius: 8,
  Capricorn: 9,
  Aquarius: 10,
  Pisces: 11,
};

/** Erro máximo publicado contra o Swiss Ephemeris, em graus. A Lua usa a série embutida. */
const ERROR_BUDGET_DEG: Record<string, number> = {
  moon: 9.6 / 3600,
  true_node: 60 / 3600,
  neptune: 4.6 / 3600,
  pluto: 3.4 / 3600,
  uranus: 1.9 / 3600,
  chiron: 1 / 3600,
};

function errorBudget(body: string) {
  return ERROR_BUDGET_DEG[body] ?? 1 / 3600;
}

function decanEdgeDistance(degreeWithinSign: number) {
  return Math.min(degreeWithinSign, 10 - (degreeWithinSign % 10), 30 - degreeWithinSign);
}

function boundarySensitive(chart: Chart) {
  return Object.entries(chart.bodies)
    .filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== undefined)
    .filter(([body, position]) => decanEdgeDistance(position.signDeg) <= errorBudget(body))
    .map(([body, position]) => body);
}

function expectProjectReading(chart: Chart) {
  expect(chart.zodiac).toBe("tropical");
  expect(chart.cusps).toHaveLength(12);
  expect(chart.cusps.every((cusp) => Number.isFinite(cusp))).toBe(true);
  expect(Number.isFinite(chart.angles.asc)).toBe(true);
  expect(Number.isFinite(chart.angles.mc)).toBe(true);

  for (const body of ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "true_node", "mean_node"] as const) {
    const position = chart.bodies[body];
    expect(position, body).toBeDefined();
    if (!position) continue;
    const ours = signFromLongitude(position.lon);
    expect(ours.signIndex).toBe(SIGN_INDEX[position.sign]);
    expect(ours.degreeWithinSign).toBeCloseTo(position.signDeg, 8);
    expect(decanFromDegree(ours.degreeWithinSign)).toBeGreaterThanOrEqual(1);
    expect(chart.houseSystem === "whole_sign" ? wholeSignHouse(position.lon, chart.angles.asc) : houseNumberForLongitude(position.lon, chart.cusps)).toBe(position.house);
  }

  const north = chart.bodies.true_node;
  const mean = chart.bodies.mean_node;
  expect(north && mean).toBeTruthy();
  if (north && mean) {
    expect(normalizeLongitude(north.lon + 180)).toBeGreaterThanOrEqual(0);
    expect(Math.abs(north.lon - mean.lon)).toBeGreaterThan(0.01);
  }

  if (chart.houseSystem === "placidus") {
    expect(normalizeLongitude(chart.cusps[0]! - chart.angles.asc)).toBeLessThan(1e-6);
  }
}

describe("caelus 0.25.0 contra o contrato dos Códigos da Missão", () => {
  it("é MIT e não declara Swiss Ephemeris como dependência", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../node_modules/caelus/package.json", import.meta.url), "utf8")) as {
      license: string;
      dependencies?: Record<string, string>;
    };
    expect(pkg.license).toBe("MIT");
    expect(pkg.dependencies ?? {}).toEqual({});
  });

  it("reproduz o exemplo publicado de 10 de junho de 1990, 14:30 UT", () => {
    const chart = engine.chart(1990, 6, 10, 14, 30, 0, 27.95, -82.46, {
      houseSystem: "placidus",
      zodiac: "tropical",
    });
    expect(fmtLon(chart.bodies.sun!.lon)).toBe("19°27' Gemini");
    expect(chart.bodies.saturn!.retrograde).toBe(true);
    expect(chart.houseSystem).toBe("placidus");
    expect(chart.houseSystemRequested).toBe("placidus");
    expect(chart.unavailable).toEqual([]);
    expect(chart.warnings).toEqual([]);
    expectProjectReading(chart);
    expect(decanFromDegree(signFromLongitude(chart.bodies.sun!.lon).degreeWithinSign)).toBe(2);
    expect(boundarySensitive(chart)).toEqual([]);
  });

  it("aceita o UTC resolvido pelo fuso histórico do projeto", () => {
    const time = resolveLocalDateTime({
      date: "2015-07-20",
      time: "09:40",
      iana: "America/Sao_Paulo",
    });
    expect(time.status).toBe("unique");
    if (time.status !== "unique") return;
    expect(time.utcIso).toBe("2015-07-20T12:40:00.000Z");
    const chart = engine.chart(2015, 7, 20, 12, 40, 0, -23.5505, -46.6333, {
      houseSystem: "placidus",
      zodiac: "tropical",
    });
    expect(chart.unavailable).toEqual([]);
    expect(chart.warnings).toEqual([]);
    expectProjectReading(chart);
    expect(boundarySensitive(chart)).toEqual([]);

    const whole = engine.chart(2015, 7, 20, 12, 40, 0, -23.5505, -46.6333, {
      houseSystem: "whole_sign",
      zodiac: "tropical",
    });
    expect(whole.houseSystem).toBe("whole_sign");
    expect(wholeSignHouse(whole.bodies.moon!.lon, whole.angles.asc)).toBe(whole.bodies.moon!.house);
  });

  it("não ativa a Roda da Fortuna enquanto a fórmula segue pendente", () => {
    const chart = engine.chart(2015, 7, 20, 12, 40, 0, -23.5505, -46.6333, "placidus");
    const fortune = engine.lots(chart).find((lot) => lot.lot === "fortune");
    expect(fortune).toBeDefined();
    const result = activatePositions({
      positions: [
        { pointId: "sun", longitude: chart.bodies.sun!.lon, houseNumber: chart.bodies.sun!.house },
        { pointId: "part_of_fortune", longitude: fortune!.lon, houseNumber: fortune!.house },
      ],
      catalog: officialCatalog,
      methodologyVersion: "caelus-fit",
      pointsToActivate: ["sun", "part_of_fortune"],
      fortunaRulePending: true,
    });
    expect(result.activations.map((item) => item.natalPointId)).toEqual(["sun"]);
    expect(result.omissions.map((item) => item.pointId)).toContain("part_of_fortune");
    expect(result.activations.some((item) => item.missionCodeId.includes("fortune"))).toBe(false);
  });

  it("declara a troca de Placidus por signo inteiro acima do círculo polar", () => {
    const chart = engine.chart(2024, 1, 1, 12, 0, 0, 78.22, 15.65, "placidus");
    expect(chart.houseSystemRequested).toBe("placidus");
    expect(chart.houseSystem).toBe("whole_sign");
    expectProjectReading(chart);
  });

  it("cobre 1900, o ano mínimo do formulário, com Quíron e sem aviso de faixa", () => {
    const chart = engine.chart(1900, 1, 1, 12, 0, 0, -23.5505, -46.6333, "placidus");
    expect(chart.unavailable).toEqual([]);
    expect(chart.warnings).toEqual([]);
    expect(chart.bodies.chiron).toBeDefined();
    expect(chart.bodies.moon).toBeDefined();
    expectProjectReading(chart);
  });
});
