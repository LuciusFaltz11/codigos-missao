import { describe, expect, it } from "vitest";
import { everyPointHasHint, pointHint } from "@/features/astrology/point-hints";
import { buildNatalChart, chartPoint } from "@/features/astrology/wheel";
import { NATAL_POINTS } from "@/lib/constants/astrology";
import { toFreePreview, type PreparedChart } from "@/features/preview/redact";
import { officialCatalog } from "@/features/missions/catalog";
import type { MissionActivation } from "@/features/missions/activate";

describe("roda do mapa", () => {
  it("explica cada glifo em uma frase curta", () => {
    expect(everyPointHasHint()).toBe(true);
    expect(pointHint("sun")).toMatch(/Identidade/);
    expect(pointHint("moon")).toMatch(/Emoção/);
    for (const point of NATAL_POINTS) {
      expect(pointHint(point.id).length).toBeLessThan(90);
    }
  });

  it("coloca o ascendente à esquerda e segue no sentido anti-horário", () => {
    const ascendant = chartPoint(0, 0, 100);
    const square = chartPoint(90, 0, 100);
    expect(ascendant.x).toBeCloseTo(-100);
    expect(ascendant.y).toBeCloseTo(0);
    expect(square.x).toBeCloseTo(0);
    expect(square.y).toBeCloseTo(100);
  });

  it("mostra as posições e deriva o nodo sul sem levar o código dos outros pontos", () => {
    const cusps = Array.from({ length: 12 }, (_, index) => index * 30);
    const chart = buildNatalChart({
      ascendantLongitude: 0,
      midheavenLongitude: 270,
      cusps,
      positions: [
        { pointId: "sun", longitude: 10, retrograde: false },
        { pointId: "north_node", longitude: 40, retrograde: true },
      ],
      houses: { sun: 1 },
    });
    expect(chart?.bodies.map((body) => body.pointId)).toEqual(["sun", "south_node", "north_node", "ascendant", "midheaven"]);
    expect(chart?.bodies.find((body) => body.pointId === "south_node")?.longitude).toBe(220);
    expect(chart?.bodies.find((body) => body.pointId === "sun")).toMatchObject({
      signName: "Áries",
      houseNumber: 1,
    });
    expect(JSON.stringify(chart)).not.toMatch(/archetype|luz|sombra|mission/);

    const hiddenFortune = buildNatalChart({
      ascendantLongitude: 0,
      midheavenLongitude: 270,
      cusps,
      positions: [
        { pointId: "sun", longitude: 10, retrograde: false },
        { pointId: "part_of_fortune", longitude: 80, retrograde: null },
      ],
      houses: {},
      omitFortune: true,
    });
    expect(hiddenFortune?.bodies.some((body) => body.pointId === "part_of_fortune")).toBe(false);

    const mars = officialCatalog.find((item) => item.id === "touro-1")!;
    const activation: MissionActivation = {
      id: "ac-mars",
      natalPointId: "mars",
      signSlug: mars.signSlug,
      signName: mars.signName,
      degreeWithinSign: 14,
      houseNumber: 7,
      missionCodeId: mars.id,
      methodologyVersion: "teste",
      longitude: 44,
      retrograde: false,
      code: mars,
      trail: [],
    };
    const preview = toFreePreview({
      status: "complete",
      errorCode: null,
      cityLabel: "Cidade",
      localDate: "1990-01-01",
      localTime: "10:00",
      timezone: "America/Sao_Paulo",
      rulesValidated: true,
      freePointId: "sun",
      ascendant: { signName: "Áries", degreeWithinSign: 0 },
      midheaven: null,
      activations: [activation],
      chart,
      entitlement: "none",
      priceCents: null,
      currency: "BRL",
      productName: null,
    } satisfies PreparedChart);
    expect(JSON.stringify(preview)).not.toContain(mars.archetype);
    expect(preview.activationPoints).toEqual([
      {
        pointId: "mars",
        pointLabel: "Marte",
        signName: mars.signName,
        degreeLabel: "14°00′00″",
        houseNumber: 7,
        unlocked: false,
      },
    ]);
    expect(preview.chart?.bodies[0]?.signName).toBe("Áries");
  });
});
