import type { CVState, EntryRef, SkillWithEvidence } from "@/state/types";
import { getAliases } from "./synonyms";

/**
 * Escapes a string for use in a regular expression.
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if any of the given aliases appear in the text as standalone words.
 * Handles tricky tech terms like "C++", "C#", "Node.js".
 */
function textContainsAnyAlias(text: string, aliases: string[]): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();

  for (const alias of aliases) {
    // Fast path: if it's not even a substring, skip
    if (!lowerText.includes(alias)) continue;

    const escaped = escapeRegExp(alias);
    
    // We want word boundaries, but standard \b fails for symbols like +, #, . at the ends of words.
    // Instead, we assert that the character before and after (if they exist) 
    // are not alphanumeric letters/numbers.
    // This allows "C++" to be found in "I know C++ and..." but not inside "C++ish".
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])(${escaped})(?:[^a-zA-Z0-9]|$)`, "i");
    
    if (regex.test(lowerText)) {
      return true;
    }
  }

  return false;
}

/**
 * Computes evidence for all skills in the CV.
 * Scans experience, projects, certifications, and education entries.
 * Uses synonym-aware matching (e.g. skill "JS" is evidenced by "JavaScript" in text).
 * 
 * @param cv The CV state
 * @returns Array of skills with their computed evidence links
 */
export function computeSkillEvidence(cv: CVState): SkillWithEvidence[] {
  const result: SkillWithEvidence[] = [];

  for (const skill of cv.skills) {
    const evidencedIn: EntryRef[] = [];
    const aliases = getAliases(skill);

    const matches = (text: string) => textContainsAnyAlias(text, aliases);

    // Scan experience
    cv.experience.forEach((exp, i) => {
      const textToSearch = [exp.role, exp.company, exp.description, exp.tldr].filter(Boolean).join(" ");
      if (matches(textToSearch)) {
        evidencedIn.push({
          type: "experience",
          index: i,
          label: exp.company ? `${exp.role} @ ${exp.company}` : exp.role || "Experience",
        });
      }
    });

    // Scan projects
    cv.projects.forEach((proj, i) => {
      const textToSearch = [proj.name, proj.role, proj.description, proj.tldr].filter(Boolean).join(" ");
      if (matches(textToSearch)) {
        evidencedIn.push({
          type: "project",
          index: i,
          label: proj.name || "Project",
        });
      }
    });

    // Scan certifications
    cv.certifications.forEach((cert, i) => {
      const textToSearch = [cert.title, cert.issuer].filter(Boolean).join(" ");
      if (matches(textToSearch)) {
        evidencedIn.push({
          type: "certification",
          index: i,
          label: cert.title || "Certification",
        });
      }
    });

    // Scan education
    cv.education.forEach((edu, i) => {
      const textToSearch = [edu.degree, edu.institution].filter(Boolean).join(" ");
      if (matches(textToSearch)) {
        evidencedIn.push({
          type: "education",
          index: i,
          label: edu.degree || "Education",
        });
      }
    });

    result.push({
      name: skill,
      evidencedIn,
    });
  }

  return result;
}
