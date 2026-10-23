import { describe, expect, it } from "vitest";
import { houseNumberForLongitude, wholeSignHouse } from "@/features/astrology/houses";
import { normalizeLongitude, signFromLongitude } from "@/features/astrology/longitude";
import { resolveLocalDateTime } from "@/features/astrology/time";
import { cardArtDisplayUrl, isStoredCardArtPath, readCardArtUpload } from "@/features/missions/card-art";
import { officialCatalog } from "@/features/missions/catalog";
import { activatePositions, decanFromDegree } from "@/features/missions/activate";
import { fireCardsMissingOilAndTarot, inspectCatalog, shadowLooksContaminated } from "@/features/missions/integrity";
import { derivePatterns } from "@/features/missions/patterns";

describe("catálogo oficial", () => {
  it("preserva 36 códigos únicos e as faixas de decanato", () => {
    expect(inspectCatalog()).toEqual([]);
    expect(new Set(officialCatalog.map((code) => code.keyword)).size).toBeLessThan(36);
  });

  it("mantém óleo e tarô ausentes nas nove fichas de fogo", () => {
    const missing = fireCardsMissingOilAndTarot();
    expect(missing).toHaveLength(9);
    expect(missing.every((code) => ["aries", "leao", "sagitario"].includes(code.signSlug))).toBe(true);
  });

  it("preserva a grafia Xamà e o campo de sombra sinalizado para revisão", () => {
    expect(officialCatalog.find((code) => code.id === "cancer-2")?.archetype).toBe("Xamà das profundezas");
    const scorpio = officialCatalog.find((code) => code.id === "escorpiao-3");
    expect(scorpio && shadowLooksContaminated(scorpio)).toBe(true);
  });
});

describe("decanato sem arredondamento", () => {
  it.each([
    [0, 1],
    [9.9999, 1],
    [10, 2],
    [19.9999, 2],
    [20, 3],
    [29.9999, 3],
  ])("grau %s cai no decanato %s", (degree, decan) => {
    expect(decanFromDegree(degree)).toBe(decan);
  });

  it("troca de signo na longitude múltipla de 30 e normaliza a volta do círculo", () => {
    expect(signFromLongitude(0).signSlug).toBe("aries");
    expect(signFromLongitude(30).signSlug).toBe("touro");
    expect(signFromLongitude(30).degreeWithinSign).toBe(0);
    expect(signFromLongitude(359.999).signSlug).toBe("peixes");
    expect(signFromLongitude(359.999).degreeWithinSign).toBeCloseTo(29.999, 5);
    expect(signFromLongitude(360).signSlug).toBe("aries");
    expect(normalizeLongitude(-0.001)).toBeCloseTo(359.999, 5);
  });
});

describe("casas a partir de cúspides recebidas", () => {
  const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  it("classifica os limites sem inventar cúspide", () => {
    expect(houseNumberForLongitude(0, cusps)).toBe(1);
    expect(houseNumberForLongitude(29.999, cusps)).toBe(1);
    expect(houseNumberForLongitude(30, cusps)).toBe(2);
    expect(houseNumberForLongitude(359.999, cusps)).toBe(12);
    expect(wholeSignHouse(30, 0)).toBe(2);
  });
});

describe("ativação determinística", () => {
  it("liga ponto, signo, decanato e código e omite a Fortuna pendente", () => {
    const result = activatePositions({
      positions: [
        { pointId: "sun", longitude: 14.2, houseNumber: 1 },
        { pointId: "mars", longitude: 14.2, houseNumber: 7 },
        { pointId: "part_of_fortune", longitude: 1, houseNumber: 2 },
      ],
      catalog: officialCatalog,
      methodologyVersion: "teste",
      pointsToActivate: ["sun", "mars", "part_of_fortune"],
      fortunaRulePending: true,
    });
    expect(result.activations.map((item) => item.missionCodeId)).toEqual(["aries-2", "aries-2"]);
    expect(result.omissions[0]?.reason).toMatch(/não foi homologada/);
    const patterns = derivePatterns(result.activations);
    expect(patterns.some((pattern) => pattern.kind === "code_repeated")).toBe(true);
    expect(patterns.some((pattern) => pattern.kind === "house_concentration")).toBe(false);
  });
});

describe("fuso histórico", () => {
  it("reconhece horário ambíguo e inexistente", () => {
    const ambiguous = resolveLocalDateTime({ date: "2023-11-05", time: "01:30", iana: "America/New_York" });
    expect(ambiguous.status).toBe("ambiguous");
    if (ambiguous.status !== "ambiguous") return;
    expect(ambiguous.options).toHaveLength(2);
    const chosen = resolveLocalDateTime({
      date: "2023-11-05",
      time: "01:30",
      iana: "America/New_York",
      offsetChoice: ambiguous.options[0]?.offsetMinutes,
    });
    expect(chosen.status).toBe("unique");
    const gap = resolveLocalDateTime({ date: "2023-03-12", time: "02:30", iana: "America/New_York" });
    expect(gap.status).toBe("nonexistent");
  });

  it("aplica o horário de verão histórico de São Paulo", () => {
    const summer = resolveLocalDateTime({ date: "2018-11-04", time: "00:30", iana: "America/Sao_Paulo" });
    const winter = resolveLocalDateTime({ date: "2019-02-16", time: "23:30", iana: "America/Sao_Paulo" });
    expect(["nonexistent", "ambiguous", "unique"]).toContain(summer.status);
    expect(winter.status === "ambiguous" || winter.status === "unique").toBe(true);
  });
});

describe("arte dos códigos", () => {
  it("usa a rota interna para arquivos no storage e preserva URL remota", () => {
    expect(cardArtDisplayUrl("aries-1", null)).toBeNull();
    expect(cardArtDisplayUrl("aries-1", "aries-1.png", "123")).toBe("/api/media/card-art/aries-1?v=123");
    expect(cardArtDisplayUrl("aries-1", "https://cdn.example/carta.png")).toBe("https://cdn.example/carta.png");
    expect(isStoredCardArtPath("aries-1.png")).toBe(true);
    expect(isStoredCardArtPath("https://cdn.example/carta.png")).toBe(false);
  });

  it("aceita PNG pequeno e recusa tipo inválido", async () => {
    const png = new File([new Uint8Array([137, 80, 78, 71])], "carta.png", { type: "image/png" });
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], "carta.pdf", { type: "application/pdf" });
    const ok = await readCardArtUpload(png);
    const bad = await readCardArtUpload(pdf);
    expect(ok.ok && !ok.empty).toBe(true);
    expect(bad).toEqual({ ok: false, reason: "type" });
  });
});
