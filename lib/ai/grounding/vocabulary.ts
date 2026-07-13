/**
 * CV Vocabulary Builder
 *
 * Builds a closed set of entities (skills, tools, companies, roles, projects)
 * from the CV. Used to detect AI-invented entities not in the user's actual experience.
 */

import type { CVState } from "@/state/types";
import type { VocabularyEntry, VocabularyCategory } from "./types";

/**
 * Builds the vocabulary set from all CV sections.
 * Returns deduplicated, normalized entries.
 */
export function buildVocabulary(cv: CVState): VocabularyEntry[] {
  const seen = new Set<string>();
  const entries: VocabularyEntry[] = [];

  function add(term: string, category: VocabularyCategory): void {
    const normalized = term.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    entries.push({ term: normalized, category });
  }

  // Skills
  for (const skill of cv.skills) {
    add(skill, "skill");
  }

  // Experience: companies and roles
  for (const exp of cv.experience) {
    add(exp.company, "company");
    add(exp.role, "role");
  }

  // Projects: names
  for (const proj of cv.projects) {
    add(proj.name, "project");
  }

  // Certifications: titles (often reference tools/platforms)
  for (const cert of cv.certifications) {
    add(cert.title, "tool");
  }

  return entries;
}

/**
 * Common suffix/prefix variants for tech terms.
 * "React" should match "React.js", "ReactJS", etc.
 */
const TECH_SUFFIXES = [".js", "js", ".ts", ".py", ".rb", ".go"];

/**
 * Checks if a term exists in the vocabulary (case-insensitive).
 * Includes fuzzy matching for common tech name variations.
 */
export function isInVocabulary(term: string, vocab: VocabularyEntry[]): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return false;

  for (const entry of vocab) {
    // Exact match
    if (entry.term === normalized) return true;

    // Fuzzy: "React.js" matches "react", "reactjs" matches "react"
    const stripped = normalized.replace(/[.\-_]/g, "");
    const entryStripped = entry.term.replace(/[.\-_]/g, "");
    if (stripped === entryStripped) return true;

    // Fuzzy: term without common suffixes matches entry
    for (const suffix of TECH_SUFFIXES) {
      if (normalized.endsWith(suffix)) {
        const base = normalized.slice(0, -suffix.length);
        if (base === entry.term || base === entryStripped) return true;
      }
      if (entry.term.endsWith(suffix)) {
        const base = entry.term.slice(0, -suffix.length);
        if (base === normalized || base === stripped) return true;
      }
    }

    // Fuzzy: one is a substring of the other for short terms (>= 3 chars)
    // e.g. "Node" matches "Node.js", "TypeScript" matches "typescript"
    if (normalized.length >= 3 && entry.term.length >= 3) {
      if (entryStripped.startsWith(stripped) || stripped.startsWith(entryStripped)) {
        // Only match if the shorter one is at least 60% of the longer one's length
        const ratio = Math.min(stripped.length, entryStripped.length) / Math.max(stripped.length, entryStripped.length);
        if (ratio >= 0.6) return true;
      }
    }
  }

  return false;
}
