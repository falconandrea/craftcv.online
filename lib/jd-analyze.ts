/**
 * JD Keyword Analysis Engine
 *
 * Two-stage pipeline:
 * 1. extractKeywords() — LLM-powered extraction of structured keywords from a JD
 * 2. computeGapReport() — deterministic comparison of keywords against CV text
 */

import OpenAI from "openai";
import type { KeywordAnalysis, KeywordMatchDetail, GapReport, KeywordCategory, KeywordImportance } from "@/lib/jd-types";

// ─── Stage 1: LLM Keyword Extraction ───────────────────────────────────

const EXTRACT_PROMPT = `You are a keyword extraction engine for job descriptions. Extract structured keywords from the provided job description.

Return ONLY a raw JSON object (no markdown, no code fences) with this exact structure:

{
  "hard_skills": [
    {
      "keyword": "React",
      "category": "technology" | "tool" | "platform" | "methodology" | "other",
      "importance": "must_have" | "nice_to_have"
    }
  ],
  "acronyms": [
    {
      "acronym": "CI/CD",
      "expansion": "Continuous Integration / Continuous Deployment"
    }
  ]
}

## Rules
- Extract ONLY hard skills: technologies, programming languages, frameworks, tools, platforms, methodologies, certifications.
- DO NOT extract soft skills (leadership, communication, teamwork, etc.).
- Classify importance based on JD phrasing:
  - "must_have": required, must have, minimum, need, proven experience in, essential, necessary, prerequisite.
  - "nice_to_have": preferred, bonus, a plus, nice to have, desirable, beneficial, good to have.
  - If unclear, default to "nice_to_have".
- For each acronym extracted, also include its expanded form in the acronyms array.
- Deduplicate keywords (same normalized form should appear once).
- Return an empty hard_skills array if no hard skills can be extracted.`;

function parseModelResponse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  throw new Error("Could not parse JSON from AI response.");
}

function validateKeywordAnalysis(raw: Record<string, unknown>): KeywordAnalysis {
  const hardSkills = Array.isArray(raw.hard_skills) ? raw.hard_skills : [];
  const acronyms = Array.isArray(raw.acronyms) ? raw.acronyms : [];

  const validCategories = new Set<KeywordCategory>(["technology", "tool", "platform", "methodology", "other"]);
  const validImportance = new Set<KeywordImportance>(["must_have", "nice_to_have"]);

  return {
    hard_skills: hardSkills.map((s: Record<string, unknown>) => ({
      keyword: String(s.keyword ?? ""),
      category: validCategories.has(s.category as KeywordCategory)
        ? (s.category as KeywordCategory)
        : "other",
      importance: validImportance.has(s.importance as KeywordImportance)
        ? (s.importance as KeywordImportance)
        : "nice_to_have",
      status: "missing" as const,
    })),
    acronyms: acronyms.map((a: Record<string, unknown>) => ({
      acronym: String(a.acronym ?? ""),
      expansion: String(a.expansion ?? ""),
    })),
  };
}

export async function extractKeywords(jdText: string): Promise<KeywordAnalysis> {
  const baseURL = process.env.AI_PROVIDER_BASE_URL;
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_PROVIDER_MODEL;

  if (!baseURL || !apiKey || !model) {
    throw new Error("AI provider is not configured.");
  }

  const client = new OpenAI({ apiKey, baseURL });

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 2000,
    temperature: 0.1,
    messages: [
      { role: "system", content: EXTRACT_PROMPT },
      {
        role: "user",
        content: `Extract keywords from this job description:\n\n<job_description>\n${jdText}\n</job_description>`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = parseModelResponse(rawContent);
  return validateKeywordAnalysis(parsed);
}

// ─── Stage 2: Deterministic Gap Computation ────────────────────────────

/** Escape regex special characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find the first occurrence of `needle` in `haystack` (case-insensitive)
 * and return a context snippet around it (up to 60 chars).
 */
function extractContext(haystack: string, needle: string): string | undefined {
  const lower = haystack.toLowerCase();
  const idx = lower.indexOf(needle.toLowerCase());
  if (idx === -1) return undefined;

  const start = Math.max(0, idx - 15);
  const end = Math.min(haystack.length, idx + needle.length + 15);
  let snippet = haystack.slice(start, end).trim();

  // Collapse whitespace for cleaner display
  snippet = snippet.replace(/\s+/g, " ");

  if (start > 0) snippet = "..." + snippet;
  if (end < haystack.length) snippet = snippet + "...";

  return snippet;
}

export function computeGapReport(keywords: KeywordAnalysis, cvText: string): GapReport {
  const present: KeywordMatchDetail[] = [];
  const missing: KeywordMatchDetail[] = [];
  const cvLower = cvText.toLowerCase();

  for (const skill of keywords.hard_skills) {
    // Skip empty keywords
    if (!skill.keyword.trim()) continue;

    const pattern = `\\b${escapeRegex(skill.keyword)}\\b`;
    const regex = new RegExp(pattern, "i");
    const found = regex.test(cvText);

    if (found) {
      const context = extractContext(cvLower, skill.keyword);
      present.push({ ...skill, status: "present", context, cvPhrasing: undefined });
    } else {
      missing.push({ ...skill, status: "missing" });
    }
  }

  const mustHaves = keywords.hard_skills.filter((s) => s.importance === "must_have" && s.keyword.trim());
  const totalMustHave = mustHaves.length;
  const presentMustHave = mustHaves.filter((s) => {
    const pattern = `\\b${escapeRegex(s.keyword)}\\b`;
    return new RegExp(pattern, "i").test(cvText);
  }).length;

  const keywordScore = totalMustHave > 0 ? Math.round((presentMustHave / totalMustHave) * 100) : 100;

  // Top gaps: must_have missing first, then nice_to_have missing, max 5
  const topGaps = [...missing]
    .sort((a) => (a.importance === "must_have" ? -1 : 1))
    .slice(0, 5);

  return {
    keywordScore,
    totalMustHave,
    presentMustHave,
    present,
    missing,
    topGaps,
  };
}
