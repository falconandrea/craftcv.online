import { describe, it, expect } from "vitest";
import { normalizeAiEvaluation, parseModelResponse, evaluationFromCompletion } from "./ats-ai-response";

describe("parseModelResponse", () => {
  it("parses raw JSON", () => {
    expect(parseModelResponse('{"score":80}')).toEqual({ score: 80 });
  });

  it("parses JSON wrapped in a code fence", () => {
    expect(parseModelResponse('```json\n{"score":80}\n```')).toEqual({ score: 80 });
  });

  it("parses JSON surrounded by prose", () => {
    expect(parseModelResponse('Sure! {"score":80} Hope this helps.')).toEqual({ score: 80 });
  });

  it("throws when there is no JSON at all", () => {
    expect(() => parseModelResponse("I cannot help with that.")).toThrow();
  });
});

describe("normalizeAiEvaluation", () => {
  it("keeps a well-formed response", () => {
    const result = normalizeAiEvaluation({
      score: 74,
      componentScores: { formatting: 80, impact: 60, keywordMatch: null },
      feedback: [{ category: "impact", status: "warning", title: "Few metrics", description: "Add numbers." }],
    });
    expect(result).toEqual({
      score: 74,
      componentScores: { formatting: 80, impact: 60, keywordMatch: null },
      feedback: [{ category: "impact", status: "warning", title: "Few metrics", description: "Add numbers." }],
    });
  });

  it("returns null when the score is missing, so the caller can degrade", () => {
    expect(normalizeAiEvaluation({ feedback: [] })).toBeNull();
    expect(normalizeAiEvaluation({ score: "not a number" })).toBeNull();
  });

  it("survives missing componentScores and feedback", () => {
    const result = normalizeAiEvaluation({ score: 50 });
    expect(result?.componentScores).toEqual({ formatting: null, impact: null, keywordMatch: null });
    expect(result?.feedback).toEqual([]);
  });

  it("clamps out-of-range scores and coerces numeric strings", () => {
    const result = normalizeAiEvaluation({ score: "120", componentScores: { formatting: -5, impact: 61.6 } });
    expect(result?.score).toBe(100);
    expect(result?.componentScores.formatting).toBe(0);
    expect(result?.componentScores.impact).toBe(62);
  });

  it("drops junk feedback entries and normalises unknown enums", () => {
    const result = normalizeAiEvaluation({
      score: 50,
      feedback: [
        null,
        "a string",
        { category: "vibes", status: "exploded", title: "Odd", description: "Still useful." },
        { title: "No description" },
      ],
    });
    expect(result?.feedback).toEqual([
      { category: "formatting", status: "warning", title: "Odd", description: "Still useful." },
    ]);
  });
});

describe("evaluationFromCompletion", () => {
  it("returns null instead of throwing on unparsable output", () => {
    expect(evaluationFromCompletion("I'm sorry, I can't do that.")).toBeNull();
  });
});
