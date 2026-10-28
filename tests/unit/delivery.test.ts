import { describe, expect, it } from "vitest";
import { resolveReadingDelivery } from "@/features/reading/delivery";

describe("entrega da leitura completa", () => {
  it("esconde PDF e e-mail enquanto a interpretação ainda não existe", () => {
    expect(resolveReadingDelivery({
      readingStatus: null,
      interpretationValid: false,
      reportStatus: null,
      reportHasFile: false,
    })).toMatchObject({ phase: "queued", deliveryReady: false, interpretationReady: false, poll: true, progress: 15 });

    expect(resolveReadingDelivery({
      readingStatus: "processing",
      interpretationValid: false,
      reportStatus: null,
      reportHasFile: false,
    })).toMatchObject({ phase: "interpreting", deliveryReady: false, poll: true, progress: 45 });
  });

  it("mostra o mapa com a leitura pronta, mas só libera download quando o PDF existe", () => {
    expect(resolveReadingDelivery({
      readingStatus: "completed",
      interpretationValid: true,
      reportStatus: "processing",
      reportHasFile: false,
    })).toMatchObject({ phase: "composing", interpretationReady: true, deliveryReady: false, poll: true, progress: 80 });
  });

  it("libera os botões só com interpretação válida e relatório gravado", () => {
    expect(resolveReadingDelivery({
      readingStatus: "completed",
      interpretationValid: true,
      reportStatus: "ready",
      reportHasFile: true,
    })).toEqual({
      phase: "ready",
      progress: 100,
      poll: false,
      interpretationReady: true,
      deliveryReady: true,
    });
  });

  it("não trata relatório pronto sem arquivo como entrega completa", () => {
    expect(resolveReadingDelivery({
      readingStatus: "completed",
      interpretationValid: true,
      reportStatus: "ready",
      reportHasFile: false,
    }).deliveryReady).toBe(false);
  });

  it("para o polling em falha permanente e não mostra download", () => {
    expect(resolveReadingDelivery({
      readingStatus: "permanent_failed",
      interpretationValid: false,
      reportStatus: null,
      reportHasFile: false,
    })).toMatchObject({ phase: "failed", deliveryReady: false, poll: false });
  });
});
