/**
 * Types for JD Tailoring & Keyword Gap Analysis (P0-B)
 */

export type KeywordCategory = "technology" | "tool" | "platform" | "methodology" | "other";

export type KeywordImportance = "must_have" | "nice_to_have";

export type MatchStatus = "present" | "missing";

export interface KeywordMatchDetail {
  keyword: string;
  category: KeywordCategory;
  importance: KeywordImportance;
  status: MatchStatus;
  /** Short context snippet from CV where the keyword was found (present only) */
  context?: string;
  /** The exact phrasing used in the CV (present only) */
  cvPhrasing?: string;
}

export interface AcronymEntry {
  acronym: string;
  expansion: string;
}

export interface KeywordAnalysis {
  hard_skills: KeywordMatchDetail[];
  acronyms: AcronymEntry[];
}

export interface GapReport {
  keywordScore: number;
  totalMustHave: number;
  presentMustHave: number;
  present: KeywordMatchDetail[];
  missing: KeywordMatchDetail[];
  topGaps: KeywordMatchDetail[];
}
