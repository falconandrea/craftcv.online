import { describe, it, expect } from "vitest";
import { estimateTokens, savingsRatio } from "./token-estimator";

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 0 for null/undefined-ish input", () => {
    expect(estimateTokens(null as unknown as string)).toBe(0);
    expect(estimateTokens(undefined as unknown as string)).toBe(0);
  });

  it("estimates ~4 chars per token (ceiling)", () => {
    expect(estimateTokens("abcd")).toBe(1);      // 4 chars → 1 token
    expect(estimateTokens("abcde")).toBe(2);     // 5 chars → 2 tokens (ceil)
    expect(estimateTokens("abcdefgh")).toBe(2);  // 8 chars → 2 tokens
  });

  it("scales linearly for long text", () => {
    const text = "a".repeat(4000);
    expect(estimateTokens(text)).toBe(1000);
  });
});

describe("savingsRatio", () => {
  it("returns 0 when the baseline is empty", () => {
    expect(savingsRatio("anything", "")).toBe(0);
  });

  it("returns 0 when snapshot and full are equal size", () => {
    expect(savingsRatio("a".repeat(100), "a".repeat(100))).toBe(0);
  });

  it("returns the expected fraction when snapshot is half the size", () => {
    // snapshot = 5 tokens, full = 10 tokens → saved 50%
    const ratio = savingsRatio("a".repeat(20), "a".repeat(40));
    expect(ratio).toBeCloseTo(0.5, 5);
  });

  it("returns ~0.4 for the documented -40% target", () => {
    // snapshot 60 chars (15 tokens), full 100 chars (25 tokens) → 1 - 15/25 = 0.4
    const ratio = savingsRatio("a".repeat(60), "a".repeat(100));
    expect(ratio).toBeCloseTo(0.4, 5);
  });

  it("clamps to 0 if snapshot is somehow larger than full", () => {
    expect(savingsRatio("a".repeat(200), "a".repeat(100))).toBe(0);
  });
});
