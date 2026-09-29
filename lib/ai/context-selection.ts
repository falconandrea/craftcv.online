import type { CVState, ExperienceEntry, Project } from "@/state/types";
import { buildQuickReference, toPromptString } from "@/lib/cv/quick-reference";

/**
 * Detail-routing for the AI Optimize prompt.
 *
 * Decides — deterministically and language-aware (English + Italian) — whether
 * the model receives the compact snapshot only, targeted detail entries, or
 * the full experience/project detail for an explicit whole-CV review.
 */

export type DetailedEntry =
  | ({ type: "Experience" } & ExperienceEntry)
  | ({ type: "Project" } & Project);

export type ContextDecision =
  | { mode: "compact" }
  | { mode: "targeted"; entries: DetailedEntry[] }
  | { mode: "whole-cv" };

// Word-boundary prefix match: "review" also matches "reviewing"/"reviews",
// but never "preview" (the leading \b anchors the token start).
// Used for verb/signal matching, where inflected suffixes must match.
function hasToken(message: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`, "i").test(message);
}

// Full word-boundary match (both edges): used for entity names, roles, and
// project names, where a prefix match would produce false positives
// (e.g. a role "Dev" matching "device" inside an unrelated message).
function hasFullWord(message: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(message);
}

// CV-namespace words shared by both languages.
const CV_WORDS = ["cv", "curriculum", "resume", "résumé", "resumé"];

const REVIEW_SIGNALS = [
  // English
  "review", "audit", "assess", "evaluate", "critique", "proofread",
  "feedback", "opinion", "what do you think", "take a look", "look over",
  "go over", "rate",
  // Italian
  "rivedi", "rivedere", "revisione", "controlla", "controllo", "analizza",
  "analisi", "valuta", "valutazione", "esamina", "esame", "parere",
  "occhiata", "che ne pensi", "come sembra",
];

const IMPROVE_SIGNALS = [
  // English
  "improve", "rewrite", "translate", "rephrase", "reword", "polish",
  "strengthen", "refine", "optimize", "optimise", "enhance",
  // Italian
  "migliora", "migliorare", "riscrivi", "riscrivere", "traduci",
  "tradurre", "ottimizza", "raffina", "potenzia",
];

// Explicit whole-CV phrases that trigger full detail even without a CV word.
const WHOLE_CV_PHRASES = [
  "overall review", "general review", "full review", "complete review",
  "review everything", "overall feedback", "general feedback",
  "revisione completa", "revisione generale", "analisi completa",
  "analisi generale", "parere generale", "rivedi tutto", "controlla tutto",
  "panoramica generale",
];

const EXPERIENCE_SECTION_WORDS = [
  "experience", "experiences", "bullet", "bullets", "role", "roles",
  "job", "jobs", "employment", "work history",
  "esperienza", "esperienze", "ruolo", "ruoli", "lavoro", "lavori",
  "percorso",
];

const PROJECT_SECTION_WORDS = [
  "project", "projects", "progetto", "progetti",
];

// Entity names shorter than this are ignored to avoid substring false
// matches (e.g. a company literally named "A" matching almost any sentence).
const MIN_ENTITY_LENGTH = 3;

function entityMatches(message: string, name: string | undefined): boolean {
  if (!name || name.trim().length < MIN_ENTITY_LENGTH) return false;
  return hasFullWord(message, name.trim());
}

export function selectContextDetail(
  lastUserMessage: string | undefined,
  cv: Pick<CVState, "experience" | "projects">
): ContextDecision {
  const message = (lastUserMessage ?? "").trim().toLowerCase();
  if (!message) return { mode: "compact" };

  // 1. Narrow entity match takes precedence over broad review intent.
  const entries: DetailedEntry[] = [];
  for (const exp of cv.experience) {
    if (entityMatches(message, exp.company) || entityMatches(message, exp.role)) {
      entries.push({ type: "Experience", ...exp });
    }
  }
  for (const proj of cv.projects) {
    if (entityMatches(message, proj.name)) {
      entries.push({ type: "Project", ...proj });
    }
  }
  if (entries.length > 0) return { mode: "targeted", entries };

  const isReview = REVIEW_SIGNALS.some(t => hasToken(message, t));
  const isImprove = IMPROVE_SIGNALS.some(t => hasToken(message, t));
  const mentionsCv = CV_WORDS.some(t => hasToken(message, t));
  const isWholeCvPhrase = WHOLE_CV_PHRASES.some(p => message.includes(p));

  // 2. Explicit whole-CV review/improvement intent.
  if (isWholeCvPhrase || ((isReview || isImprove) && mentionsCv)) {
    return { mode: "whole-cv" };
  }

  // 3. Section-scoped improvement/review (e.g. "rewrite my bullets",
  //    "migliora le esperienze") expands only the mentioned section(s).
  if (isReview || isImprove) {
    const sectionEntries: DetailedEntry[] = [];
    if (EXPERIENCE_SECTION_WORDS.some(t => hasToken(message, t))) {
      sectionEntries.push(...cv.experience.map(e => ({ type: "Experience" as const, ...e })));
    }
    if (PROJECT_SECTION_WORDS.some(t => hasToken(message, t))) {
      sectionEntries.push(...cv.projects.map(p => ({ type: "Project" as const, ...p })));
    }
    if (sectionEntries.length > 0) return { mode: "targeted", entries: sectionEntries };
  }

  return { mode: "compact" };
}

/**
 * Composes the CV context block for the AI Optimize system prompt:
 * compact snapshot first, then detail expansion according to the decision.
 * Pure and deterministic — the route delegates here.
 */
export function buildCvContext(cv: CVState, lastUserMessage: string | undefined): string {
  const snapshotStr = toPromptString(buildQuickReference(cv));
  let context =
    `\n\n## Current CV Snapshot\n` +
    `The following is a token-efficient summary of the user's CV. Use this as your primary context.\n\n` +
    `${snapshotStr}\n`;

  const decision = selectContextDetail(lastUserMessage, cv);

  if (decision.mode === "whole-cv") {
    // Arrays are dumped as-is: empty arrays are genuinely empty and the model
    // may only report a section as absent when the source array is empty.
    context +=
      `\n## Full Detail Context\n` +
      `(Included because your request was a whole-CV review. Empty arrays mean the section is genuinely empty — do not invent content.)\n` +
      `${JSON.stringify({ experience: cv.experience, projects: cv.projects }, null, 2)}\n`;
  } else if (decision.mode === "targeted" && decision.entries.length > 0) {
    context +=
      `\n## Full Detail Context\n` +
      `(Included for the specific entries you mentioned)\n` +
      `${JSON.stringify(decision.entries, null, 2)}\n`;
  }

  return context;
}
