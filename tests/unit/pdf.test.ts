import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildNatalChart } from "@/features/astrology/wheel";
import { officialCatalog } from "@/features/missions/catalog";
import { CARTOGRAPHY_CLOSING, INSPIRATION_IMPACT, INSPIRATION_TITLE, OPENING_COPY } from "@/features/reading/pdf-copy";
import { pdfImageDataUri, isPdfEmbeddableImage, guessImageContentType } from "@/features/reading/pdf-images";
import { activationLead, orderedActivations, uniqueCodes } from "@/features/reading/pdf-structure";
import { sanitizePdfText, withoutEmDash } from "@/features/reading/pdf-text";
import { renderReportPdf } from "@/server/services/pdf";
import type { MissionActivation } from "@/features/missions/activate";
import type { InterpretationResult } from "@/features/interpretation/validate";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function pdfText(pdf: Buffer | Uint8Array) {
  const raw = Buffer.from(pdf).toString("latin1");
  const streams = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((match) => {
    try {
      return inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
    } catch {
      return match[1];
    }
  }).join("\n");
  return [...streams.matchAll(/<([0-9a-fA-F]+)>/g)]
    .map((match) => {
      const hex = match[1] ?? "";
      let text = "";
      for (let index = 0; index < hex.length; index += 2) {
        text += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
      }
      return text;
    })
    .join("");
}

function activation(pointId: string, codeId = "aries-1"): MissionActivation {
  const code = officialCatalog.find((item) => item.id === codeId)!;
  return {
    id: `ac-${pointId}`,
    natalPointId: pointId,
    signSlug: code.signSlug,
    signName: code.signName,
    degreeWithinSign: 4.2,
    houseNumber: 7,
    missionCodeId: code.id,
    methodologyVersion: "1.0.0",
    longitude: 4.2,
    retrograde: null,
    code,
    trail: [pointId, code.archetype],
  };
}

const reading = (activationIds: string[]): InterpretationResult => ({
  individual_readings: activationIds.map((id) => ({
    activation_id: id,
    headline: "Sol encontra o arquétipo",
    interpretation: "A leitura descreve o encontro entre o ponto, o signo, a casa e o arquétipo sem inventar eventos.".repeat(3),
    light_expression: "uma expressão de luz suficiente",
    shadow_expression: "uma expressão de sombra suficiente",
    reflective_question: "O que você observa neste encontro?",
  })),
  patterns: [
    {
      pattern_id: "code:sagitario-2",
      activation_ids: ["ac-mercury", "ac-neptune"],
      theme: "Transformação da dor em sabedoria",
      insight: "A presença do código sagitario-2 em ac-mercury e ac-neptune, ambos na casa 8, reforça a cura.",
      evidence: "A repetição literal do código sagitario-2 em ac-mercury e ac-neptune.",
    },
  ],
  overall_synthesis: "A síntese costura as ativações em relações observáveis, sem destino fixo e sem diagnóstico. ".repeat(8),
  closing_reflection: "Fica o convite à observação pessoal, com elegância e sem promessa absoluta de resultado.",
  reflective_questions: ["O que permanece em observação nesta leitura?"],
});

describe("imagens do PDF", () => {
  it("embute PNG e JPEG e recusa WebP", () => {
    expect(guessImageContentType("aries-1.png")).toBe("image/png");
    expect(isPdfEmbeddableImage("image/webp")).toBe(false);
    expect(pdfImageDataUri(PNG_1X1, "image/png")).toMatch(/^data:image\/png;base64,/);
    expect(pdfImageDataUri(PNG_1X1, "image/webp")).toBeNull();
  });
});

describe("estrutura editorial do PDF", () => {
  it("ordena as ativações e agrupa cartas repetidas", () => {
    const activations = [
      activation("mercury"),
      activation("sun"),
      activation("moon", "touro-1"),
      activation("ascendant"),
    ];
    expect(orderedActivations(activations).map((item) => item.natalPointId)).toEqual([
      "sun",
      "moon",
      "ascendant",
      "mercury",
    ]);
    const codes = uniqueCodes(activations);
    expect(codes).toHaveLength(2);
    expect(codes[0]?.missionCodeId).toBe("aries-1");
    expect(codes[0]?.activations.map((item) => item.natalPointId)).toEqual(["sun", "ascendant", "mercury"]);
    expect(codes[1]?.missionCodeId).toBe("touro-1");
  });

  it("monta a frase de ativação com o número oficial, sem chips", () => {
    const sun = activation("sun");
    const moon = activation("moon");
    expect(activationLead(sun)).toBe(
      `Seu Sol é ativado pelo código número ${String(sun.code.number).padStart(2, "0")} ${sun.code.archetype}.`,
    );
    expect(activationLead(moon)).toBe(
      `Sua Lua é ativada pelo código número ${String(moon.code.number).padStart(2, "0")} ${moon.code.archetype}.`,
    );
    expect(activationLead(sun)).not.toMatch(/casa|decanato|°/i);
  });

  it("abre com o convite oficial dos Códigos da Missão", () => {
    const copy = OPENING_COPY.join(" ");
    expect(copy).toMatch(/36 arquétipos/);
    expect(copy).toMatch(/15 pontos ativados/);
    expect(copy).toMatch(/Sol, Lua, Ascendente/);
    expect(INSPIRATION_IMPACT).toBe("A MAIOR MISSÃO É RELEMBRAR QUEM SOMOS.");
  });

  it("remove travessão e IDs técnicos", () => {
    expect(withoutEmDash("luz — sombra e presença – transformação")).toBe("luz, sombra e presença, transformação");
    const cleaned = sanitizePdfText(
      "A presença do código sagitario-2 em ac-mercury e ac-neptune, ambos na casa 8, reforça a cura.",
    );
    expect(cleaned).not.toMatch(/ac-mercury|sagitario-2/i);
    expect(cleaned).toMatch(/casa 8/);
  });
});

describe("documento da leitura", () => {
  it("gera um PDF editorial com carta, fechamento padrão e sem títulos de relatório", async () => {
    const sun = activation("sun");
    const mercury = activation("mercury");
    const chart = buildNatalChart({
      ascendantLongitude: 0,
      midheavenLongitude: 270,
      cusps: Array.from({ length: 12 }, (_, index) => index * 30),
      positions: [
        { pointId: "sun", longitude: 10, retrograde: false },
        { pointId: "mercury", longitude: 20, retrograde: false },
      ],
      houses: { sun: 1, mercury: 1 },
    });
    const pdf = await renderReportPdf({
      name: "Maria Teste",
      cityLabel: "Porto Alegre, RS, Brasil",
      localDate: "1990-03-21",
      localTime: "14:30",
      timezone: "America/Sao_Paulo",
      methodologyVersion: "1.0.0",
      calculationVersion: "caelus@test",
      notice: "",
      activations: [sun, mercury],
      reading: reading(["ac-sun", "ac-mercury"]),
      cardImages: { [sun.code.id]: pdfImageDataUri(PNG_1X1, "image/png") ?? "" },
      chart,
    });
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(2000);
    const text = pdfText(pdf);
    expect(text).toContain("36 arquétipos");
    expect(text).toContain(INSPIRATION_IMPACT);
    expect(text).toContain(INSPIRATION_TITLE);
    expect(text).toMatch(/cartografia simb/);
    expect(text).toContain("Seu Sol");
    expect(text).toContain("01");
    expect(text).toContain("4,20");
    expect(text).not.toMatch(/′|″/);
    expect(text).not.toContain("Pergunta para observar");
    expect(text).not.toContain("ac-mercury");
    expect(text).not.toContain("sagitario-2");
    expect(text).not.toContain("Padrões e síntese");
    expect(CARTOGRAPHY_CLOSING.length).toBeGreaterThan(200);
  }, 30_000);
});
