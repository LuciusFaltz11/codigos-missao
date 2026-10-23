import { describe, expect, it } from "vitest";
import { composeBirthDate, composeBirthTime, daysInMonth } from "@/components/birth-form/birth-fields";

describe("data do formulário", () => {
  const today = new Date(2026, 9, 22);

  it("monta 4 de outubro de 2003", () => {
    expect(composeBirthDate("2003", "10", "04", today)).toEqual({ ok: true, value: "2003-10-04" });
  });

  it("recusa 31 de fevereiro e uma data futura", () => {
    expect(composeBirthDate("2003", "02", "31", today).ok).toBe(false);
    expect(composeBirthDate("2026", "10", "23", today)).toMatchObject({ ok: false, reason: "future" });
  });

  it("fevereiro de 2004 tem 29 dias e fevereiro de 2003 tem 28", () => {
    expect(daysInMonth("2004", "02")).toBe(29);
    expect(daysInMonth("2003", "02")).toBe(28);
  });

  it("monta 13:45", () => {
    expect(composeBirthTime("13", "45")).toBe("13:45");
    expect(composeBirthTime("24", "00")).toBeNull();
  });
});

describe("formatação", () => {
  it("formata data, horário de Brasília e e-mail mascarado", async () => {
    const { formatDatePt, formatDateTimePt, maskEmail } = await import("@/lib/formatters");
    expect(formatDatePt("1990-06-10")).toBe("10/06/1990");
    expect(formatDateTimePt("2026-10-23T18:05:00.000Z")).toBe("23/10/2026, 15:05");
    expect(maskEmail("maria@example.com")).toBe("m***@example.com");
  });
});