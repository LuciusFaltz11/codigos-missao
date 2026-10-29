import { describe, expect, it } from "vitest";
import { officialCatalog } from "@/features/missions/catalog";
import { pdfImageDataUri, isPdfEmbeddableImage, guessImageContentType } from "@/features/reading/pdf-images";
import { renderReportPdf } from "@/server/services/pdf";
import type { MissionActivation } from "@/features/missions/activate";
import type { InterpretationResult } from "@/features/interpretation/validate";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("imagens do PDF", () => {
  it("embute PNG e JPEG e recusa WebP", () => {
    expect(guessImageContentType("aries-1.png")).toBe("image/png");
    expect(isPdfEmbeddableImage("image/webp")).toBe(false);
    expect(pdfImageDataUri(PNG_1X1, "image/png")).toMatch(/^data:image\/png;base64,/);
    expect(pdfImageDataUri(PNG_1X1, "image/webp")).toBeNull();
  });
});

describe("documento da leitura", () => {
  it("gera um PDF com a carta do código", async () => {
    const code = officialCatalog[0];
    const activation: MissionActivation = {
      id: "ac-sun",
      natalPointId: "sun",
      signSlug: code.signSlug,
      signName: code.signName,
      degreeWithinSign: 4.2,
      houseNumber: 7,
      missionCodeId: code.id,
      methodologyVersion: "1.0.0",
      longitude: 4.2,
      retrograde: null,
      code,
      trail: ["Sol", code.archetype],
    };
    const reading: InterpretationResult = {
      individual_readings: [
        {
          activation_id: "ac-sun",
          headline: "Sol encontra o arquétipo",
          interpretation: "A leitura descreve o encontro entre o ponto, o signo, a casa e o arquétipo sem inventar eventos.".repeat(3),
          light_expression: "uma expressão de luz suficiente",
          shadow_expression: "uma expressão de sombra suficiente",
          reflective_question: "O que você observa neste encontro?",
        },
      ],
      patterns: [],
      overall_synthesis: "A síntese costura as ativações em relações observáveis, sem destino fixo e sem diagnóstico. ".repeat(8),
      closing_reflection: "Fica o convite à observação pessoal, com elegância e sem promessa absoluta de resultado.",
      reflective_questions: ["O que permanece em observação nesta leitura?"],
    };
    const pdf = await renderReportPdf({
      name: "Maria Teste",
      cityLabel: "Porto Alegre, RS, Brasil",
      localDate: "1990-03-21",
      localTime: "14:30",
      timezone: "America/Sao_Paulo",
      methodologyVersion: "1.0.0",
      calculationVersion: "caelus@test",
      notice: "",
      activations: [activation],
      reading,
      cardImages: { [code.id]: pdfImageDataUri(PNG_1X1, "image/png") ?? "" },
    });
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  });
});
