/**
 * Token Estimator
 *
 * Cheap heuristic estimator for OpenAI-style token counts.
 * Used to validate the snapshot-first prompt strategy (Cluster D, FR-06):
 * we log estimated tokens for the snapshot vs. the equivalent full-JSON
 * context, so the "-40% tokens" success metric becomes measurable.
 *
 * This is NOT a tokenizer — it's a deterministic approximation good enough
 * for aggregate trend analysis. The actual `usage` from the provider is the
 * source of truth for billing; this is only for the savings ratio.
 */

/**
 * Conservative heuristic: ~4 characters per token for English/code text.
 * (OpenAI's BPE averages 4 chars/token; rounding to int.)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Estimates the token count of a string.
 * Deterministic and side-effect free.
 *
 * @example
 * estimateTokens("hello world") // 3
 * estimateTokens("")            // 0
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Computes the token-savings ratio of using the snapshot over the full JSON.
 *
 * @param snapshotText the prompt string built from the quick-reference snapshot
 * @param fullJsonText the prompt string that would have been built from the full CV JSON
 * @returns a number in [0, 1] representing the fraction of tokens saved.
 *          Returns 0 if the full JSON text is empty (no baseline).
 *
 * @example
 * savingsRatio("short", "longer text") // 0.4
 */
export function savingsRatio(snapshotText: string, fullJsonText: string): number {
  const snapshot = estimateTokens(snapshotText);
  const full = estimateTokens(fullJsonText);
  if (full === 0) return 0;
  return Math.max(0, 1 - snapshot / full);
}
