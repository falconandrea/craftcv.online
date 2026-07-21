import { describe, it, expect } from "vitest";

import {
  parseAcceptHeader,
  wantsMarkdown,
  estimateTokens,
} from "./negotiate";

describe("parseAcceptHeader", () => {
  it("returns an empty list for null or empty input", () => {
    expect(parseAcceptHeader(null)).toEqual([]);
    expect(parseAcceptHeader("")).toEqual([]);
    expect(parseAcceptHeader("   ")).toEqual([]);
  });

  it("parses a single media type with default q=1", () => {
    expect(parseAcceptHeader("text/markdown")).toEqual([
      { type: "text/markdown", q: 1 },
    ]);
  });

  it("parses multiple comma-separated types", () => {
    const result = parseAcceptHeader("text/html, text/markdown, application/json");
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.type)).toEqual([
      "text/html",
      "text/markdown",
      "application/json",
    ]);
  });

  it("parses q-values", () => {
    const result = parseAcceptHeader("text/markdown;q=0.9, text/html;q=0.1");
    expect(result).toEqual([
      { type: "text/markdown", q: 0.9 },
      { type: "text/html", q: 0.1 },
    ]);
  });

  it("lowercases media types for case-insensitive comparison", () => {
    expect(parseAcceptHeader("TEXT/MARKDOWN")).toEqual([
      { type: "text/markdown", q: 1 },
    ]);
  });

  it("defaults q to 1 when q parameter is malformed", () => {
    const result = parseAcceptHeader("text/markdown;q=notanumber");
    expect(result).toEqual([{ type: "text/markdown", q: 1 }]);
  });
});

describe("wantsMarkdown", () => {
  it("returns false when there is no Accept header (browser default)", () => {
    expect(wantsMarkdown(null)).toBe(false);
    expect(wantsMarkdown("")).toBe(false);
  });

  it("returns true for a plain text/markdown request", () => {
    expect(wantsMarkdown("text/markdown")).toBe(true);
  });

  it("returns true when markdown is preferred over html via q-values", () => {
    expect(wantsMarkdown("text/markdown;q=0.9, text/html;q=0.1")).toBe(true);
  });

  it("returns true when markdown and html are tied (markdown wins on tie)", () => {
    expect(wantsMarkdown("text/markdown, text/html")).toBe(true);
    expect(wantsMarkdown("text/markdown;q=0.5, text/html;q=0.5")).toBe(true);
  });

  it("returns false when html is preferred over markdown", () => {
    expect(wantsMarkdown("text/markdown;q=0.1, text/html;q=0.9")).toBe(false);
  });

  it("returns false when markdown is explicitly refused with q=0", () => {
    expect(wantsMarkdown("text/markdown;q=0, text/html")).toBe(false);
  });

  it("returns true when only markdown is listed (no html)", () => {
    expect(wantsMarkdown("text/markdown;q=0.1")).toBe(true);
  });

  it("returns false for a typical browser Accept header", () => {
    const browserAccept =
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";
    expect(wantsMarkdown(browserAccept)).toBe(false);
  });

  it("returns false for a wildcard */* Accept (no explicit markdown)", () => {
    expect(wantsMarkdown("*/*")).toBe(false);
  });
});

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns at least 1 for any non-empty input", () => {
    expect(estimateTokens("a")).toBe(1);
  });

  it("approximates tokens as roughly chars/4", () => {
    // 40 chars -> 10 tokens
    expect(estimateTokens("a".repeat(40))).toBe(10);
    // 41 chars -> ceil(41/4) = 11
    expect(estimateTokens("a".repeat(41))).toBe(11);
  });

  it("produces a positive number for the home page markdown body", () => {
    const sampleBody =
      "---\ntitle: CraftCV\ndescription: test\n---\n\n# Build your CV\n\nSome content here.";
    expect(estimateTokens(sampleBody)).toBeGreaterThan(0);
  });
});
