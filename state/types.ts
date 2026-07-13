/**
 * CV Data Types
 *
 * Single source of truth for all CV data.
 * Based on DATA_SCHEMA.md and PROJECT.md documentation.
 */

export type CVLanguage = "en" | "it";

/**
 * Personal Information Section
 */
export interface PersonalInfo {
  fullName: string;
  location: string;
  email: string;
  links: string[]; // GitHub, LinkedIn, personal site, etc.
}

/**
 * Experience Entry
 */
export interface ExperienceEntry {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null; // null = "Present"
  location?: string;
  description: string;
  /** One-sentence summary for AI context and recruiter scanning (≤ 30 words) */
  tldr?: string;
}

/**
 * Certification Entry
 */
export interface Certification {
  title: string;
  issuer: string;
  year?: string;
}

/**
 * Side Project Entry
 */
export interface Project {
  name: string;
  role: string;
  link: string;
  description: string;
  /** One-sentence summary for AI context and recruiter scanning (≤ 30 words) */
  tldr?: string;
}

/**
 * Education Entry
 */
export interface Education {
  degree: string;
  institution: string;
  location: string;
  year: string;
}

/**
 * Custom Section Entry (free-text with editable title)
 */
export interface CustomSection {
  title: string;
  content: string;
}

// ─── Skill Evidence Types (derived, not stored) ────────────────────────────

export type EntryRefType = "experience" | "project" | "certification" | "education";

/** Reference to a CV entry where a skill is evidenced */
export interface EntryRef {
  type: EntryRefType;
  index: number;
  /** Display label, e.g. "Senior Dev @ Acme" */
  label: string;
}

/** Enriched skill with evidence links — computed at read-time, never persisted */
export interface SkillWithEvidence {
  name: string;
  evidencedIn: EntryRef[];
}

// ─── Language ───────────────────────────────────────────────────────────────

export interface Language {
  language: string;
  proficiency: string;
}

/**
 * Complete CV State
 */
export interface CVState {
  personalInfo: PersonalInfo;
  summary: string;
  experience: ExperienceEntry[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
  customSection: CustomSection;
  education: Education[];
  languages: Language[];
  cvLanguage?: CVLanguage;
}

/**
 * Default empty state for reset action
 */
export const defaultCVState: CVState = {
  personalInfo: {
    fullName: "",
    location: "",
    email: "",
    links: [],
  },
  summary: "",
  experience: [],
  skills: [],
  certifications: [],
  projects: [],
  education: [],
  languages: [],
  customSection: { title: "Interests", content: "" },
  cvLanguage: "en",
};

/**
 * Partial CV update from AI — any subset of CVState fields.
 * Personal Info is intentionally excluded from AI edits.
 */
export type CVPatch = Partial<Omit<CVState, "personalInfo">>;

/**
 * AI Chat Message
 */
export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Structured patch the AI proposes to apply to the CV */
  proposedChanges?: CVPatch;
  /** Whether the user has acted on the proposed changes */
  changeStatus?: "pending" | "applied" | "skipped";
  /** Grounding validation report from the server-side post-LLM checks */
  groundingReport?: import("@/lib/ai/grounding/types").GroundingReport;
}

