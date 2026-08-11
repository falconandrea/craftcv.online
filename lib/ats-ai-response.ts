/**
 * Parsing and validation of the ATS evaluation returned by the LLM.
 *
 * Kept out of the route handler so it can be unit-tested without pulling in
 * `pdf-parse` and the OpenAI client: this is the layer that decides whether
 * the results dashboard gets renderable data or the degraded, deterministic
 * only report.
 */

export type FeedbackCategory = "formatting" | "impact" | "keyword" | "missing_info";
export type FeedbackStatus = "passed" | "warning" | "failed";

const FEEDBACK_CATEGORIES: ReadonlySet<FeedbackCategory> = new Set<FeedbackCategory>([
  "formatting",
  "impact",
  "keyword",
  "missing_info",
]);
const FEEDBACK_STATUSES: ReadonlySet<FeedbackStatus> = new Set<FeedbackStatus>([
  "passed",
  "warning",
  "failed",
]);

/** Type guards so the validators below narrow unknown model output safely. */
function isFeedbackCategory(value: string): value is FeedbackCategory {
  return (FEEDBACK_CATEGORIES as ReadonlySet<string>).has(value);
}
function isFeedbackStatus(value: string): value is FeedbackStatus {
  return (FEEDBACK_STATUSES as ReadonlySet<string>).has(value);
}

export interface FeedbackItem {
  category: FeedbackCategory;
  status: FeedbackStatus;
  title: string;
  description: string;
}

export interface AiEvaluation {
  score: number;
  componentScores: {
    formatting: number | null;
    impact: number | null;
    keywordMatch: number | null;
  };
  feedback: FeedbackItem[];
}

/** Pull a JSON object out of a raw completion, tolerating code fences. */
export function parseModelResponse(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
  }
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* fall through */ }
  }
  throw new Error("Could not parse JSON from AI response.");
}

function toScore(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Shape the model output into something the UI can always render.
 * Returns null when the response is unusable (no score at all), so the caller
 * can still serve the deterministic report instead of a broken page.
 */
export function normalizeAiEvaluation(raw: Record<string, unknown>): AiEvaluation | null {
  const score = toScore(raw.score);
  if (score === null) return null;

  const componentsRaw = (raw.componentScores ?? {}) as Record<string, unknown>;
  const feedbackRaw = Array.isArray(raw.feedback) ? raw.feedback : [];

  const feedback = feedbackRaw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map(item => {
      const category = String(item.category);
      const status = String(item.status);
      return {
        category: isFeedbackCategory(category) ? category : "formatting",
        status: isFeedbackStatus(status) ? status : "warning",
        title: String(item.title ?? "Untitled check").slice(0, 200),
        description: String(item.description ?? "").slice(0, 2000),
      };
    })
    .filter(item => item.description.length > 0)
    .slice(0, 30);

  return {
    score,
    componentScores: {
      formatting: toScore(componentsRaw.formatting),
      impact: toScore(componentsRaw.impact),
      keywordMatch: toScore(componentsRaw.keywordMatch),
    },
    feedback,
  };
}

/** Convenience wrapper: raw completion text → evaluation, or null if unusable. */
export function evaluationFromCompletion(raw: string): AiEvaluation | null {
  try {
    return normalizeAiEvaluation(parseModelResponse(raw));
  } catch {
    return null;
  }
}
