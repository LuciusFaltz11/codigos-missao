const ORIGIN_PATTERN = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i;

export function parseOriginList(value: string | undefined) {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const trimmed = part.trim().replace(/\/$/, "");
    if (!ORIGIN_PATTERN.test(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
  }
  return [...seen];
}

export function originFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(origin: string | null | undefined, allowed: string[]) {
  if (!origin) return false;
  return allowed.includes(origin.replace(/\/$/, ""));
}

export function corsHeadersForOrigin(origin: string | null | undefined, allowed: string[]): Record<string, string> {
  if (!isAllowedOrigin(origin, allowed)) return {};
  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

export function frameAncestorsDirective(origins: string[]) {
  return origins.length > 0 ? origins.join(" ") : "'none'";
}
