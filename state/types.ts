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

/**
 * Language Entry
 */
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

