import { DateTime } from "luxon";

export const CHART_UNLOCK_AT = "2026-11-11T20:00:00-03:00";
export const CHART_LOCKED_MESSAGE = "O mapa será liberado às 20:00 de 11/11.";

export type UnlockRemaining = {
  locked: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

export function chartUnlockMs() {
  const unlock = DateTime.fromISO(CHART_UNLOCK_AT, { setZone: true });
  return unlock.isValid ? unlock.toMillis() : 0;
}

export function remainingUntilUnlock(nowMs = Date.now(), unlockMs = chartUnlockMs()): UnlockRemaining {
  const totalMs = Math.max(0, unlockMs - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    locked: totalMs > 0,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

export function chartGenerationLocked(nowMs = Date.now()) {
  return remainingUntilUnlock(nowMs).locked;
}
