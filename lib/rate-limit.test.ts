import { describe, it, expect } from "vitest";
import { rateLimit, clientKey } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const key = "test:allow";
    const t0 = 1_000_000;
    expect(rateLimit(key, 3, 60_000, t0).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000, t0 + 1).ok).toBe(true);
    const third = rateLimit(key, 3, 60_000, t0 + 2);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);

    const blocked = rateLimit(key, 3, 60_000, t0 + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("frees the quota once the window has passed", () => {
    const key = "test:window";
    const t0 = 2_000_000;
    rateLimit(key, 1, 10_000, t0);
    expect(rateLimit(key, 1, 10_000, t0 + 5_000).ok).toBe(false);
    expect(rateLimit(key, 1, 10_000, t0 + 10_001).ok).toBe(true);
  });

  it("keeps separate buckets per key", () => {
    const t0 = 3_000_000;
    expect(rateLimit("test:a", 1, 60_000, t0).ok).toBe(true);
    expect(rateLimit("test:b", 1, 60_000, t0).ok).toBe(true);
    expect(rateLimit("test:a", 1, 60_000, t0).ok).toBe(false);
  });
});

describe("clientKey", () => {
  it("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientKey(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    expect(clientKey(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
