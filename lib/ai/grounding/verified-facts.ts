/**
 * Verified Facts Extractor
 *
 * Extracts immutable facts (numbers, dates, IDs) from CVState.
 * These facts are used to protect verifiable data from AI modifications.
 */

import type { CVState } from "@/state/types";
import type { VerifiedFact } from "./types";

/** Regex for percentages, multipliers, counts with context */
const NUMERIC_PATTERN = /(?<!\w)(\d[\d,.]*(?:[%x×]|))(?!\w)/g;

/**
 * Extracts all verifiable facts from a CV.
 * Facts include: dates, years, numeric metrics, certification/education identifiers.
 */
export function extractVerifiedFacts(cv: CVState): VerifiedFact[] {
  const facts: VerifiedFact[] = [];

  // ─── Experience dates + description metrics ───────────────────────
  cv.experience.forEach((exp, i) => {
    if (exp.startDate) {
      facts.push({
        value: exp.startDate,
        type: "temporal",
        sourcePath: `experience[${i}].startDate`,
      });
    }
    if (exp.endDate) {
      facts.push({
        value: exp.endDate,
        type: "temporal",
        sourcePath: `experience[${i}].endDate`,
      });
    }

    // Extract numeric metrics from description bullets
    const numericMatches = exp.description.matchAll(NUMERIC_PATTERN);
    for (const match of numericMatches) {
      const val = match[1];
      // Skip single-digit numbers (too common/ambiguous) and pure years (handled separately)
      if (val.length <= 1) continue;
      if (/^(19|20)\d{2}$/.test(val)) continue;
      facts.push({
        value: val,
        type: "numeric",
        sourcePath: `experience[${i}].description`,
      });
    }
  });

  // ─── Education years ──────────────────────────────────────────────
  cv.education.forEach((edu, i) => {
    if (edu.year) {
      facts.push({
        value: edu.year,
        type: "temporal",
        sourcePath: `education[${i}].year`,
      });
    }

    // Extract numeric facts from degree (e.g., "110/110" in Italian grading)
    const degreeNumerics = edu.degree.matchAll(NUMERIC_PATTERN);
    for (const match of degreeNumerics) {
      const val = match[1];
      if (val.length <= 1) continue;
      if (/^(19|20)\d{2}$/.test(val)) continue;
      facts.push({
        value: val,
        type: "numeric",
        sourcePath: `education[${i}].degree`,
      });
    }
  });

  // ─── Certification years + identity facts ─────────────────────────
  cv.certifications.forEach((cert, i) => {
    if (cert.year) {
      facts.push({
        value: cert.year,
        type: "temporal",
        sourcePath: `certifications[${i}].year`,
      });
    }

    // Cert title + issuer as composite identity fact
    if (cert.title && cert.issuer) {
      facts.push({
        value: `${cert.title} | ${cert.issuer}`,
        type: "identity",
        sourcePath: `certifications[${i}]`,
      });
    }
  });

  // ─── Project description metrics ──────────────────────────────────
  cv.projects.forEach((proj, i) => {
    const numericMatches = proj.description.matchAll(NUMERIC_PATTERN);
    for (const match of numericMatches) {
      const val = match[1];
      if (val.length <= 1) continue;
      if (/^(19|20)\d{2}$/.test(val)) continue;
      facts.push({
        value: val,
        type: "numeric",
        sourcePath: `projects[${i}].description`,
      });
    }
  });

  return facts;
}
