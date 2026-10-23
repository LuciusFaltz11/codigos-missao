import { createHash } from "node:crypto";

type Bucket = { hits: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();

export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimitKey(request: Request, route: string) {
  const raw = `${clientAddress(request)}:${route}`;
  return createHash("sha256").update(raw).digest("hex");
}

/** Limitador em memória. Em várias instâncias, a proteção é parcial e está documentada. */
export function consumeMemoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (current.hits >= limit) return { allowed: false, remaining: 0 };
  current.hits += 1;
  return { allowed: true, remaining: limit - current.hits };
}
