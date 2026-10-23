import { describe, expect, it } from "vitest";
import { fmtLon } from "caelus";
import { signFromLongitude } from "@/features/astrology/longitude";
import { decanFromDegree, activatePositions } from "@/features/missions/activate";
import { officialCatalog } from "@/features/missions/catalog";
import { houseNumberForLongitude } from "@/features/astrology/houses";
import { CaelusAstronomyProvider, createAstronomyProvider } from "@/server/providers/astronomy";

const provider = new CaelusAstronomyProvider();

const tampa = {
  utcIso: "1990-06-10T14:30:00.000Z",
  latitude: 27.95,
  longitude: -82.46,
  houseSystem: "placidus" as const,
  zodiac: "tropical" as const,
  nodeMode: "true" as const,
  fortunaRule: "pending_approval" as const,
};

describe("adaptador Caelus", () => {
  it("devolve posições e deixa o código da missão para o signo e o decanato", async () => {
    const result = await provider.calculate(tampa);
    expect(result.status).toBe("complete");
    if (result.status !== "complete") return;
    const sun = result.calculation.positions.find((item) => item.pointId === "sun");
    expect(sun).toBeDefined();
    expect(fmtLon(sun!.longitude)).toBe("19°27' Gemini");
    const sign = signFromLongitude(sun!.longitude);
    const decan = decanFromDegree(sign.degreeWithinSign);
    const housed = houseNumberForLongitude(sun!.longitude, result.calculation.cusps);
    const activated = activatePositions({
      positions: [{ pointId: "sun", longitude: sun!.longitude, houseNumber: housed, retrograde: sun!.retrograde }],
      catalog: officialCatalog,
      methodologyVersion: "caelus",
      pointsToActivate: ["sun"],
      fortunaRulePending: true,
    });
    expect(activated.activations[0]?.signSlug).toBe("gemeos");
    expect(activated.activations[0]?.code.id).toBe(`gemeos-${decan}`);
    expect(result.calculation.positions.some((item) => item.pointId === "part_of_fortune")).toBe(false);
    expect(result.calculation.positions.some((item) => item.pointId === "south_node")).toBe(false);
    expect(result.calculation.positions.some((item) => item.pointId === "north_node")).toBe(true);
    expect(result.calculation.engine).toBe("caelus");
    expect(result.calculation.engineVersion).toBe("0.25.0");
  });

  it("recusa Placidus acima do círculo polar", async () => {
    const result = await provider.calculate({
      ...tampa,
      utcIso: "2024-01-01T12:00:00.000Z",
      latitude: 78.22,
      longitude: 15.65,
    });
    expect(result).toEqual({ status: "failed", errorCode: "house_system_unavailable" });
  });

  it("calcula signo inteiro quando a metodologia pede esse sistema", async () => {
    const result = await provider.calculate({ ...tampa, houseSystem: "whole_sign" });
    expect(result.status).toBe("complete");
    if (result.status !== "complete") return;
    expect(result.calculation.parameters.houseSystem).toBe("whole_sign");
  });

  it("só inclui a Roda da Fortuna depois da fórmula homologada", async () => {
    const approved = await provider.calculate({ ...tampa, fortunaRule: "day_night_traditional" });
    expect(approved.status).toBe("complete");
    if (approved.status !== "complete") return;
    expect(approved.calculation.positions.some((item) => item.pointId === "part_of_fortune")).toBe(true);
  });

  it("não escolhe ayanamsa sideral", async () => {
    const result = await provider.calculate({ ...tampa, zodiac: "sidereal" });
    expect(result).toEqual({ status: "failed", errorCode: "sidereal_ayanamsa_unconfigured" });
  });

  it("liga o Caelus sem a licença do Swiss Ephemeris", () => {
    expect(createAstronomyProvider({ engine: "caelus", licenseConfirmed: false }).state).toBe("configured");
    expect(createAstronomyProvider({ engine: "none", licenseConfirmed: false }).state).toBe("not_configured");
    expect(createAstronomyProvider({ engine: "swiss_worker", licenseConfirmed: false }).state).toBe("license_unconfirmed");
  });
});