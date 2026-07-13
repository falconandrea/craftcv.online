/**
 * Grounding & Anti-Hallucination Types
 *
 * Types for the post-LLM validation layer that prevents fact drift,
 * blocks invented entities, and flags unverifiable metrics.
 */

// ─── Verified Facts ─────────────────────────────────────────────────────

export type VerifiedFactType = "numeric" | "temporal" | "identity";

export interface VerifiedFact {
  /** The raw value as it appears in the CV (e.g. "2021", "3.4", "AWS Solutions Architect") */
  value: string;
  /** Classification of the fact */
  type: VerifiedFactType;
  /** Dot-path to the source in CVState (e.g. "education[0].year", "experience[1].startDate") */
  sourcePath: string;
}

// ─── Vocabulary ─────────────────────────────────────────────────────────

export type VocabularyCategory = "skill" | "tool" | "company" | "role" | "project";

export interface VocabularyEntry {
  /** Normalized lowercase term */
  term: string;
  /** Where this term originated */
  category: VocabularyCategory;
}

// ─── Grounding Flags ────────────────────────────────────────────────────

export interface FlaggedInvention {
  /** The invented term/entity */
  term: string;
  /** Best-guess category */
  category: string;
  /** User-facing message */
  message: string;
}

export interface NeedsVerification {
  /** What was in the original (null if no original metric existed) */
  original: string | null;
  /** The proposed metric */
  proposed: string;
  /** User-facing message */
  message: string;
}

export interface RejectedVerifiedEdit {
  /** The protected fact that was targeted */
  fact: VerifiedFact;
  /** What the AI tried to change it to */
  proposed: string;
  /** User-facing message */
  message: string;
}

export interface StyleWarning {
  /** The original bullet text */
  original: string;
  /** The proposed (weakened) rewrite */
  proposed: string;
  /** User-facing message */
  message: string;
}

// ─── Grounding Report ───────────────────────────────────────────────────

export interface GroundingReport {
  /** Number of patch fields that passed all checks cleanly */
  appliedCount: number;
  /** Entities the AI introduced that aren't in the CV vocabulary */
  flaggedInventions: FlaggedInvention[];
  /** Metrics proposed without evidence in the original CV */
  needsVerification: NeedsVerification[];
  /** Changes to immutable facts that were blocked */
  rejectedVerifiedEdits: RejectedVerifiedEdit[];
  /** Bullets rewritten with passive openers */
  styleWarnings: StyleWarning[];
}

/** Returns true if the report contains any flags */
export function hasGroundingFlags(report: GroundingReport): boolean {
  return (
    report.flaggedInventions.length > 0 ||
    report.needsVerification.length > 0 ||
    report.rejectedVerifiedEdits.length > 0 ||
    report.styleWarnings.length > 0
  );
}
