import type { CVState } from "@/state/types";
import { computeSkillEvidence } from "./skill-evidence";

export interface QuickReference {
  summary: string;
  identity: {
    currentTitle?: string;
    location: string;
  };
  roles: {
    title: string;
    company: string;
    period: string;
    tldr?: string;
  }[];
  topSkills: string[];
  certs: {
    title: string;
    issuer: string;
    year?: string;
  }[];
  education: string[];
  languages: {
    language: string;
    proficiency: string;
  }[];
  customSection?: {
    title: string;
    content: string;
  };
  links: string[];
}

/**
 * Builds a deterministic, token-efficient snapshot of the CV.
 * Useful as a base context for AI prompts instead of sending the full JSON.
 */
export function buildQuickReference(cv: CVState): QuickReference {
  // Compute skills with evidence for sorting
  const evidencedSkills = computeSkillEvidence(cv);
  
  // Sort skills by evidence count (descending), then alphabetically for determinism
  const sortedSkills = evidencedSkills.sort((a, b) => {
    const diff = b.evidencedIn.length - a.evidencedIn.length;
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  const topSkills = sortedSkills.slice(0, 15).map(s => s.name);

  // Determine current title from the first "Present" job, or fallback to the very first job
  const currentJob = cv.experience.find(e => !e.endDate) || cv.experience[0];
  const currentTitle = currentJob ? currentJob.role : undefined;

  return {
    summary: cv.summary || "",
    identity: {
      location: cv.personalInfo?.location || "",
      currentTitle,
    },
    roles: cv.experience.map(e => ({
      title: e.role,
      company: e.company,
      period: `${e.startDate} - ${e.endDate || "Present"}`,
      tldr: e.tldr,
    })),
    topSkills,
    certs: cv.certifications.map(c => ({
      title: c.title,
      issuer: c.issuer,
      year: c.year,
    })),
    // Map education to simple one-liners
    education: cv.education.map(e => {
      let eduStr = `${e.degree} @ ${e.institution}`;
      if (e.year) eduStr += ` (${e.year})`;
      return eduStr;
    }),
    languages: cv.languages.map(l => ({
      language: l.language,
      proficiency: l.proficiency,
    })),
    customSection: cv.customSection
      ? { title: cv.customSection.title, content: cv.customSection.content }
      : undefined,
    links: cv.personalInfo?.links ? [...cv.personalInfo.links].sort() : [],
  };
}

/**
 * Serializes the QuickReference snapshot into a compact Markdown-like string.
 * This is the string sent to the AI in the system prompt.
 */
export function toPromptString(ref: QuickReference): string {
  let output = `[ IDENTITY ]\n`;
  if (ref.identity.currentTitle) output += `Title: ${ref.identity.currentTitle}\n`;
  if (ref.identity.location) output += `Location: ${ref.identity.location}\n`;
  if (ref.links && ref.links.length > 0) output += `Links: ${ref.links.join(" | ")}\n`;

  if (ref.summary) {
    output += `\n[ SUMMARY ]\n${ref.summary}\n`;
  }

  if (ref.roles && ref.roles.length > 0) {
    output += `\n[ ROLES ]\n`;
    ref.roles.forEach(r => {
      output += `- ${r.title} @ ${r.company} (${r.period})\n`;
      if (r.tldr) output += `  TLDR: ${r.tldr}\n`;
    });
  }

  if (ref.topSkills && ref.topSkills.length > 0) {
    output += `\n[ TOP SKILLS ]\n${ref.topSkills.join(", ")}\n`;
  }

  if (ref.certs && ref.certs.length > 0) {
    output += `\n[ CERTIFICATIONS ]\n`;
    ref.certs.forEach(c => {
      output += `- ${c.title} by ${c.issuer}${c.year ? ` (${c.year})` : ""}\n`;
    });
  }

  if (ref.education && ref.education.length > 0) {
    output += `\n[ EDUCATION ]\n`;
    ref.education.forEach(e => {
      output += `- ${e}\n`;
    });
  }

  if (ref.languages && ref.languages.length > 0) {
    output += `\n[ LANGUAGES ]\n`;
    ref.languages.forEach(l => {
      output += `- ${l.language} (${l.proficiency})\n`;
    });
  }

  if (ref.customSection && ref.customSection.content) {
    output += `\n[ CUSTOM SECTION: ${ref.customSection.title} ]\n${ref.customSection.content}\n`;
  }

  return output.trim();
}
