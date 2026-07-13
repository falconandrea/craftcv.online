/**
 * Patch Validator — Core Grounding Engine
 *
 * Runs 4 post-LLM checks on proposed CV patches:
 * 1. Verified Facts Protection (FR-03)
 * 2. Anti-Invention (FR-05)
 * 3. Needs-Verification flagging (FR-08)
 * 4. STAR/XYZ style enforcement (FR-12)
 */

import type { CVState, CVPatch } from "@/state/types";
import type {
  GroundingReport,
  FlaggedInvention,
  NeedsVerification,
  RejectedVerifiedEdit,
  StyleWarning,
  VerifiedFact,
  VocabularyEntry,
} from "./types";
import { extractVerifiedFacts } from "./verified-facts";
import { buildVocabulary, isInVocabulary } from "./vocabulary";

// ─── Entity extraction heuristic ────────────────────────────────────────

/** Common words that appear capitalized but are not tech entities */
const COMMON_WORDS = new Set([
  "the", "and", "for", "with", "from", "into", "using", "via", "across", "over",
  "team", "teams", "project", "projects", "system", "systems", "service", "services",
  "data", "code", "api", "apis", "app", "application", "applications",
  "web", "mobile", "cloud", "server", "client", "user", "users",
  "senior", "junior", "lead", "staff", "principal", "manager", "director",
  "engineer", "developer", "architect", "analyst", "designer", "intern",
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  "present", "current", "new", "full", "time", "stack",
  // Common CV adjectives/verbs that start sentences
  "experienced", "skilled", "proven", "proficient", "dedicated", "motivated",
  "accomplished", "results", "driven", "dynamic", "innovative", "passionate",
  "built", "led", "designed", "developed", "implemented", "managed", "created",
  "maintained", "improved", "reduced", "increased", "delivered", "mentored",
  "spearheaded", "orchestrated", "architected", "optimized", "streamlined",
  "collaborated", "contributed", "established", "launched", "automated",
  // Common nouns
  "performance", "solution", "solutions", "process", "processes",
  "platform", "infrastructure", "architecture", "framework", "pipeline",
  "deployment", "integration", "development", "production", "environment",
  "database", "frontend", "backend", "microservices", "monolith",
  "scalable", "reliable", "robust", "high", "low", "end",
]);

/**
 * Extracts candidate entity names from text.
 * Looks for capitalized words and known tech patterns (e.g., "Node.js", "C++").
 */
function extractCandidateEntities(text: string): string[] {
  const entities: string[] = [];
  // Match capitalized words, allowing dots/plus/hash for tech (e.g. Node.js, C++, C#)
  const pattern = /\b([A-Z][a-zA-Z0-9]*(?:[.+#][a-zA-Z0-9]*)*)\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const term = match[1];
    if (term.length < 2) continue;
    if (COMMON_WORDS.has(term.toLowerCase())) continue;
    entities.push(term);
  }
  return [...new Set(entities)];
}

// ─── Numeric metric detection ───────────────────────────────────────────

/** Matches quantified metrics: numbers with %, x, or contextual words */
const METRIC_PATTERN = /(\d[\d,.]*\s*(?:%|x|×|percent|times)|\d[\d,.]*\s*(?:users?|req\/s|rps|tps|ms|seconds?|minutes?|hours?))/gi;

function extractMetrics(text: string): string[] {
  const matches = text.matchAll(METRIC_PATTERN);
  return [...matches].map((m) => m[0].trim());
}

// ─── Passive opener detection ───────────────────────────────────────────

const PASSIVE_OPENERS = [
  /^responsible\s+for\b/i,
  /^tasked\s+with\b/i,
  /^helped\s+(to\s+)?/i,
  /^assisted\s+(in\s+|with\s+)?/i,
  /^involved\s+in\b/i,
  /^participated\s+in\b/i,
  /^worked\s+on\b/i,
];

function hasPassiveOpener(bullet: string): boolean {
  const trimmed = bullet.replace(/^[•\-*]\s*/, "").trim();
  return PASSIVE_OPENERS.some((re) => re.test(trimmed));
}

// ─── Main validator ─────────────────────────────────────────────────────

export interface ValidatePatchResult {
  cleanPatch: CVPatch;
  report: GroundingReport;
}

/**
 * Check 0 — Destructive change prevention.
 *
 * Strips fields where the LLM replaced non-empty content with empty/null/blank.
 * Mutates `cleanPatch` in place by `delete`-ing the offending keys.
 *
 * This catches the most dangerous LLM failure mode: returning a "complete"
 * CV object where fields it couldn't see in the snapshot get blanked out.
 * If applied naively, this would destroy user data (summary, languages, etc.).
 *
 * We silently drop rather than surface because the user never asked for these
 * changes — surfacing them in the diff would create noise and confusion.
 */
function removeDestructiveChanges(cleanPatch: CVPatch, cv: CVState): void {
  // summary: non-empty → empty
  if (cleanPatch.summary !== undefined) {
    const proposed = cleanPatch.summary;
    const current = cv.summary;
    if ((current && current.trim().length > 0) && (!proposed || !proposed.trim())) {
      console.warn("[AI Grounding] Rejected destructive change: summary would be blanked.");
      delete cleanPatch.summary;
    }
  }

  // skills: non-empty array → empty array
  if (cleanPatch.skills !== undefined) {
    if (cv.skills.length > 0 && (!cleanPatch.skills || cleanPatch.skills.length === 0)) {
      console.warn("[AI Grounding] Rejected destructive change: skills array would be emptied.");
      delete cleanPatch.skills;
    }
  }

  // languages: non-empty array → empty array
  if (cleanPatch.languages !== undefined) {
    if (cv.languages.length > 0 && (!cleanPatch.languages || cleanPatch.languages.length === 0)) {
      console.warn("[AI Grounding] Rejected destructive change: languages array would be emptied.");
      delete cleanPatch.languages;
    }
  }

  // customSection.content: non-empty → empty
  if (cleanPatch.customSection !== undefined) {
    const currentContent = cv.customSection?.content;
    const proposedContent = cleanPatch.customSection.content;
    if (
      currentContent && currentContent.trim().length > 0 &&
      (!proposedContent || !proposedContent.trim())
    ) {
      console.warn("[AI Grounding] Rejected destructive change: customSection.content would be blanked.");
      // Restore the content but keep any other valid change to customSection (e.g. title).
      cleanPatch.customSection.content = currentContent;
    }
  }
}

/**
 * Validates a proposed CV patch against the original CV.
 * Returns a clean patch (with verified-fact violations removed) and a grounding report.
 */
export function validatePatch(patch: CVPatch, cv: CVState): ValidatePatchResult {
  const facts = extractVerifiedFacts(cv);
  const vocab = buildVocabulary(cv);

  const flaggedInventions: FlaggedInvention[] = [];
  const needsVerification: NeedsVerification[] = [];
  const rejectedVerifiedEdits: RejectedVerifiedEdit[] = [];
  const styleWarnings: StyleWarning[] = [];

  const cleanPatch: CVPatch = { ...patch };

  // ─── Check 0: Destructive change prevention ─────────────────────
  // Runs FIRST. Silently strips fields where the LLM replaced non-empty
  // content with empty/null/blank. This is almost never what the user wants
  // and is usually a side-effect of the LLM "filling in" fields it couldn't
  // read from the snapshot. Logged server-side; not surfaced to the UI to
  // avoid confusing the user with changes they never asked for.
  removeDestructiveChanges(cleanPatch, cv);

  // ─── Check 1: Verified Facts Protection ─────────────────────────
  checkVerifiedFacts(cleanPatch, cv, facts, rejectedVerifiedEdits);

  // ─── Check 2: Anti-Invention ────────────────────────────────────
  checkInventions(cleanPatch, cv, vocab, flaggedInventions);

  // ─── Check 3: Needs-Verification metrics ────────────────────────
  checkUnverifiedMetrics(cleanPatch, cv, facts, needsVerification);

  // ─── Check 4: STAR/XYZ style ────────────────────────────────────
  checkStyleWeakening(cleanPatch, cv, styleWarnings);

  // Count applied (fields with no flags)
  const totalFields = Object.keys(cleanPatch).length;
  const flaggedFields = new Set([
    ...flaggedInventions.map((f) => f.term),
    ...needsVerification.map((f) => f.proposed),
    ...rejectedVerifiedEdits.map((f) => f.proposed),
  ]).size;

  const report: GroundingReport = {
    appliedCount: Math.max(0, totalFields - flaggedFields),
    flaggedInventions,
    needsVerification,
    rejectedVerifiedEdits,
    styleWarnings,
  };

  return { cleanPatch, report };
}

// ─── Check implementations ──────────────────────────────────────────────

function checkVerifiedFacts(
  patch: CVPatch,
  cv: CVState,
  facts: VerifiedFact[],
  rejected: RejectedVerifiedEdit[]
): void {
  // Check education years
  if (patch.education) {
    patch.education = patch.education.map((edu, i) => {
      const originalEdu = cv.education[i];
      if (!originalEdu) return edu;

      const yearFact = facts.find((f) => f.sourcePath === `education[${i}].year`);
      if (yearFact && edu.year !== originalEdu.year) {
        rejected.push({
          fact: yearFact,
          proposed: edu.year,
          message: `Education year "${originalEdu.year}" is a verified fact — AI change to "${edu.year}" was blocked.`,
        });
        return { ...edu, year: originalEdu.year };
      }
      return edu;
    });
  }

  // Check experience dates
  if (patch.experience) {
    patch.experience = patch.experience.map((exp, i) => {
      const originalExp = cv.experience[i];
      if (!originalExp) return exp;

      const startFact = facts.find((f) => f.sourcePath === `experience[${i}].startDate`);
      const endFact = facts.find((f) => f.sourcePath === `experience[${i}].endDate`);

      let fixed = exp;
      if (startFact && exp.startDate !== originalExp.startDate) {
        rejected.push({
          fact: startFact,
          proposed: exp.startDate,
          message: `Start date "${originalExp.startDate}" is a verified fact — AI change to "${exp.startDate}" was blocked.`,
        });
        fixed = { ...fixed, startDate: originalExp.startDate };
      }
      if (endFact && exp.endDate !== originalExp.endDate) {
        rejected.push({
          fact: endFact,
          proposed: exp.endDate ?? "",
          message: `End date "${originalExp.endDate}" is a verified fact — AI change to "${exp.endDate}" was blocked.`,
        });
        fixed = { ...fixed, endDate: originalExp.endDate };
      }
      return fixed;
    });
  }

  // Check certification years
  if (patch.certifications) {
    patch.certifications = patch.certifications.map((cert, i) => {
      const originalCert = cv.certifications[i];
      if (!originalCert) return cert;

      const yearFact = facts.find((f) => f.sourcePath === `certifications[${i}].year`);
      if (yearFact && cert.year !== originalCert.year) {
        rejected.push({
          fact: yearFact,
          proposed: cert.year ?? "",
          message: `Certification year "${originalCert.year}" is a verified fact — AI change to "${cert.year}" was blocked.`,
        });
        return { ...cert, year: originalCert.year };
      }
      return cert;
    });
  }
}

function checkInventions(
  patch: CVPatch,
  cv: CVState,
  vocab: VocabularyEntry[],
  flagged: FlaggedInvention[]
): void {
  // Check skills array for new entries
  if (patch.skills) {
    for (const skill of patch.skills) {
      if (!isInVocabulary(skill, vocab)) {
        // Check if it was in the original skills (could be a legitimate rename)
        if (!cv.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
          flagged.push({
            term: skill,
            category: "skill",
            message: `"${skill}" is not in your CV. Add it only if you can evidence it.`,
          });
        }
      }
    }
  }

  // Check experience role/company renames for invented titles
  if (patch.experience) {
    patch.experience.forEach((exp, i) => {
      const orig = cv.experience[i];
      if (!orig) return;

      // Flag if the role was changed to something not in the vocabulary
      if (exp.role.toLowerCase() !== orig.role.toLowerCase()) {
        if (!isInVocabulary(exp.role, vocab)) {
          flagged.push({
            term: exp.role,
            category: "role",
            message: `Role "${exp.role}" is not in your CV. The original was "${orig.role}".`,
          });
        }
      }

      // Flag if the company was changed to something not in the vocabulary
      if (exp.company.toLowerCase() !== orig.company.toLowerCase()) {
        if (!isInVocabulary(exp.company, vocab)) {
          flagged.push({
            term: exp.company,
            category: "company",
            message: `Company "${exp.company}" is not in your CV. The original was "${orig.company}".`,
          });
        }
      }
    });
  }

  // Check text fields for new entities
  const textFields: Array<{ field: string; proposed: string; original: string }> = [];

  if (patch.summary !== undefined) {
    textFields.push({ field: "summary", proposed: patch.summary, original: cv.summary });
  }
  if (patch.experience) {
    patch.experience.forEach((exp, i) => {
      const orig = cv.experience[i];
      if (orig) {
        textFields.push({
          field: `experience[${i}].description`,
          proposed: [exp.description, exp.tldr].filter(Boolean).join(" "),
          original: [orig.description, orig.tldr].filter(Boolean).join(" "),
        });
      }
    });
  }
  if (patch.projects) {
    patch.projects.forEach((proj, i) => {
      const orig = cv.projects[i];
      if (orig) {
        textFields.push({
          field: `projects[${i}].description`,
          proposed: [proj.description, proj.tldr].filter(Boolean).join(" "),
          original: [orig.description, orig.tldr].filter(Boolean).join(" "),
        });
      }
    });
  }

  for (const { proposed, original } of textFields) {
    const newEntities = extractCandidateEntities(proposed);
    const oldEntities = new Set(extractCandidateEntities(original).map((e) => e.toLowerCase()));

    for (const entity of newEntities) {
      if (oldEntities.has(entity.toLowerCase())) continue;
      if (isInVocabulary(entity, vocab)) continue;

      flagged.push({
        term: entity,
        category: "entity",
        message: `"${entity}" is not in your CV. Add it only if you can evidence it.`,
      });
    }
  }
}

function checkUnverifiedMetrics(
  patch: CVPatch,
  cv: CVState,
  facts: VerifiedFact[],
  unverified: NeedsVerification[]
): void {
  const existingNumerics = new Set(
    facts.filter((f) => f.type === "numeric").map((f) => f.value)
  );

  // Check experience descriptions
  if (patch.experience) {
    patch.experience.forEach((exp, i) => {
      const orig = cv.experience[i];
      if (!orig) return;

      const proposedMetrics = extractMetrics([exp.description, exp.tldr].filter(Boolean).join(" "));
      const originalMetrics = extractMetrics([orig.description, orig.tldr].filter(Boolean).join(" "));
      const originalSet = new Set(originalMetrics.map((m) => m.toLowerCase()));

      for (const metric of proposedMetrics) {
        if (originalSet.has(metric.toLowerCase())) continue;
        // Check if the number part matches any existing verified numeric
        const numMatch = metric.match(/[\d,.]+/);
        if (numMatch && existingNumerics.has(numMatch[0])) continue;

        unverified.push({
          original: null,
          proposed: metric,
          message: `"${metric}" isn't from your CV. Confirm or edit before applying.`,
        });
      }
    });
  }

  // Check project descriptions
  if (patch.projects) {
    patch.projects.forEach((proj, i) => {
      const orig = cv.projects[i];
      if (!orig) return;

      const proposedMetrics = extractMetrics([proj.description, proj.tldr].filter(Boolean).join(" "));
      const originalMetrics = extractMetrics([orig.description, orig.tldr].filter(Boolean).join(" "));
      const originalSet = new Set(originalMetrics.map((m) => m.toLowerCase()));

      for (const metric of proposedMetrics) {
        if (originalSet.has(metric.toLowerCase())) continue;
        const numMatch = metric.match(/[\d,.]+/);
        if (numMatch && existingNumerics.has(numMatch[0])) continue;

        unverified.push({
          original: null,
          proposed: metric,
          message: `"${metric}" isn't from your CV. Confirm or edit before applying.`,
        });
      }
    });
  }

  // Check summary
  if (patch.summary !== undefined) {
    const proposedMetrics = extractMetrics(patch.summary);
    const originalMetrics = extractMetrics(cv.summary);
    const originalSet = new Set(originalMetrics.map((m) => m.toLowerCase()));

    for (const metric of proposedMetrics) {
      if (originalSet.has(metric.toLowerCase())) continue;
      const numMatch = metric.match(/[\d,.]+/);
      if (numMatch && existingNumerics.has(numMatch[0])) continue;

      unverified.push({
        original: null,
        proposed: metric,
        message: `"${metric}" isn't from your CV. Confirm or edit before applying.`,
      });
    }
  }
}

function checkStyleWeakening(
  patch: CVPatch,
  cv: CVState,
  warnings: StyleWarning[]
): void {
  // Check experience bullets
  if (patch.experience) {
    patch.experience.forEach((exp, i) => {
      const orig = cv.experience[i];
      if (!orig) return;

      const proposedBullets = exp.description.split("\n");
      const originalBullets = orig.description.split("\n");

      proposedBullets.forEach((bullet, j) => {
        const originalBullet = originalBullets[j];
        if (!originalBullet) return;

        // Only flag if the original did NOT have a passive opener but the rewrite does
        if (!hasPassiveOpener(originalBullet) && hasPassiveOpener(bullet)) {
          warnings.push({
            original: originalBullet.trim(),
            proposed: bullet.trim(),
            message: "Passive opener detected — consider using an active verb.",
          });
        }
      });
    });
  }

  // Check project bullets
  if (patch.projects) {
    patch.projects.forEach((proj, i) => {
      const orig = cv.projects[i];
      if (!orig) return;

      const proposedBullets = proj.description.split("\n");
      const originalBullets = orig.description.split("\n");

      proposedBullets.forEach((bullet, j) => {
        const originalBullet = originalBullets[j];
        if (!originalBullet) return;

        if (!hasPassiveOpener(originalBullet) && hasPassiveOpener(bullet)) {
          warnings.push({
            original: originalBullet.trim(),
            proposed: bullet.trim(),
            message: "Passive opener detected — consider using an active verb.",
          });
        }
      });
    });
  }
}
