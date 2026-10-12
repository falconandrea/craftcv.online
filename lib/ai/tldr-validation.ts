/**
 * TL;DR response evaluation — shared by /api/ai/tldr and its tests.
 *
 * Classifies WHY a provider response was rejected so the route can log a
 * minimal diagnostic (rejection category + candidate lengths + finish reason)
 * without ever logging the CV, prompt, response text, keys or headers.
 *
 * Limits mirror the prompt contract (lib/ai/prompts/tldr.ts) and the route:
 * max 200 characters / 30 words, no masked placeholders. A `finish_reason` of
 * "length" means the provider stopped generating before normal termination,
 * so the payload is rejected as incomplete (`length_truncated`) regardless of
 * its content. Rejections are never truncated or auto-repaired — the client
 * asks the user to retry.
 */

import { findFirstJsonObject } from "@/lib/ai/parse-model-response";

export const TLDR_MAX_CHARS = 200;
export const TLDR_MAX_WORDS = 30;

const PLACEHOLDER_PATTERN = /\[(?:PHONE|EMAIL|LINK|CANDIDATE NAME)\]/i;

export type TldrRejection =
  | "length_truncated"
  | "no_content"
  | "no_json"
  | "json_parse_failed"
  | "missing_tldr"
  | "empty_tldr"
  | "too_long_chars"
  | "too_many_words"
  | "placeholder";

export interface TldrEvaluationOk {
  ok: true;
  tldr: string;
}

export interface TldrEvaluationRejected {
  ok: false;
  rejection: TldrRejection;
  /** Lengths of the rejected candidate, when a string was available. */
  chars?: number;
  words?: number;
}

export type TldrEvaluation = TldrEvaluationOk | TldrEvaluationRejected;

/**
 * Evaluates raw provider message content against the TL;DR contract.
 * Mirrors exactly the checks the route performed inline before 2026-10-11.
 * `finishReason` is the provider's `finish_reason` for the choice.
 * Note: findFirstJsonObject only returns slices that already parse, so
 * json_parse_failed is a defensive branch for future parser changes.
 */
export function evaluateTldr(
  content: string | null | undefined,
  finishReason?: string | null,
): TldrEvaluation {
  // "length" = the output budget was exhausted before the generation
  // terminated normally. The payload is therefore treated as incomplete and
  // rejected, even when it happens to contain a complete JSON object: it is
  // the prefix of an answer the provider never finished.
  if (finishReason === "length") {
    return { ok: false, rejection: "length_truncated" };
  }

  if (!content || !content.trim()) {
    return { ok: false, rejection: "no_content" };
  }

  const json = findFirstJsonObject(content);
  if (!json) {
    return { ok: false, rejection: "no_json" };
  }

  let result: unknown;
  try {
    result = JSON.parse(json);
  } catch {
    return { ok: false, rejection: "json_parse_failed" };
  }

  if (
    !result || typeof result !== "object" ||
    !("tldr" in result) || typeof (result as { tldr: unknown }).tldr !== "string"
  ) {
    return { ok: false, rejection: "missing_tldr" };
  }

  const tldr = (result as { tldr: string }).tldr.trim().replace(/\s+/g, " ");
  if (!tldr) {
    return { ok: false, rejection: "empty_tldr" };
  }

  const chars = tldr.length;
  const words = tldr.split(/\s+/).length;
  if (chars > TLDR_MAX_CHARS) {
    return { ok: false, rejection: "too_long_chars", chars, words };
  }
  if (words > TLDR_MAX_WORDS) {
    return { ok: false, rejection: "too_many_words", chars, words };
  }
  if (PLACEHOLDER_PATTERN.test(tldr)) {
    return { ok: false, rejection: "placeholder", chars, words };
  }
  return { ok: true, tldr };
}
