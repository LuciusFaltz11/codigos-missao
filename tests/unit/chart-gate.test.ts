import { describe, expect, it } from "vitest";
import { chartGenerationLocked, chartUnlockMs, remainingUntilUnlock } from "@/features/launch/chart-gate";

describe("liberação do mapa", () => {
  it("bloqueia antes das 20:00 de 11/11 e libera no horário", () => {
    const unlock = chartUnlockMs();
    expect(chartGenerationLocked(unlock - 1)).toBe(true);
    expect(chartGenerationLocked(unlock)).toBe(false);
    expect(remainingUntilUnlock(unlock - 65_000)).toMatchObject({
      locked: true,
      hours: 0,
      minutes: 1,
      seconds: 5,
    });
    expect(remainingUntilUnlock(unlock + 1).locked).toBe(false);
  });
});
