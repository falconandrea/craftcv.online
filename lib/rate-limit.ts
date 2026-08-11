/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Scope: one process. The app ships as a single `output: "standalone"`
 * container behind Traefik, so this is enough to stop one client from burning
 * the AI budget. If the deployment ever scales to multiple replicas this needs
 * to move to a shared store (Redis / Upstash) — the interface stays the same.
 */

interface Bucket {
  /** Timestamps (ms) of the requests still inside the window. */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Drop buckets nobody has touched for a while, so the Map cannot grow forever. */
function sweep(now: number, windowMs: number) {
  for (const [key, bucket] of buckets) {
    const alive = bucket.hits.filter(t => now - t < windowMs);
    if (alive.length === 0) buckets.delete(key);
    else bucket.hits = alive;
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Seconds until the oldest hit leaves the window (only meaningful when !ok). */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size > 5000) sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter(t => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfter: 0 };
}

/**
 * Best-effort client identity. Behind Traefik the real address is in
 * `x-forwarded-for`; the first entry is the client. Falls back to a shared
 * bucket, which is intentionally conservative: unknown clients share a quota.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
