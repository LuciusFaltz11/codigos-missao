import { createHash } from "node:crypto";

type RememberedChart = { token: string; redirectUrl: string; expiresAt: number };

const remembered = new Map<string, RememberedChart>();
const WINDOW_MS = 15 * 60_000;

export function wixChartFingerprint(input: {
  email: string;
  birthDate: string;
  birthTime: string;
  cityLabel: string;
}) {
  return createHash("sha256")
    .update(
      `${input.email.trim().toLowerCase()}|${input.birthDate}|${input.birthTime}|${input.cityLabel.trim().toLowerCase()}`,
    )
    .digest("hex");
}

function prune(now = Date.now()) {
  for (const [key, value] of remembered) {
    if (value.expiresAt <= now) remembered.delete(key);
  }
}

export function rememberWixChart(fingerprint: string, token: string, redirectUrl: string, now = Date.now()) {
  prune(now);
  remembered.set(fingerprint, { token, redirectUrl, expiresAt: now + WINDOW_MS });
}

export function findRememberedWixChart(fingerprint: string, now = Date.now()) {
  prune(now);
  const found = remembered.get(fingerprint);
  if (!found || found.expiresAt <= now) return null;
  return { token: found.token, redirectUrl: found.redirectUrl };
}
