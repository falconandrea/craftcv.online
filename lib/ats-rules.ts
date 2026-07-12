/**
 * ATS Score — Deterministic Rules Engine
 *
 * Pure functions that analyse extracted PDF text and return
 * reproducible, explainable checks. No AI involved.
 *
 * Each check is a function: (text, fileName?) => DeterministicCheck
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type CheckCategory = "contacts" | "bullet_quality" | "structure" | "ats_specific";
export type CheckStatus = "passed" | "warning" | "failed";

export interface DeterministicCheck {
  id: string;
  category: CheckCategory;
  status: CheckStatus;
  label: string;
  message: string;
  details?: string;
}

export interface RulesResult {
  checks: DeterministicCheck[];
  lintScore: number; // 0-100, percentage of checks passed
}

// ── Helpers ────────────────────────────────────────────────────────────────

function passed(id: string, category: CheckCategory, label: string, message: string, details?: string): DeterministicCheck {
  return { id, category, status: "passed", label, message, details };
}

function warning(id: string, category: CheckCategory, label: string, message: string, details?: string): DeterministicCheck {
  return { id, category, status: "warning", label, message, details };
}

function failed(id: string, category: CheckCategory, label: string, message: string, details?: string): DeterministicCheck {
  return { id, category, status: "failed", label, message, details };
}

/** Extract potential bullet points from text. */
function extractBullets(text: string): string[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const bullets: string[] = [];

  for (const line of lines) {
    // Lines starting with bullet characters or numbered lists
    if (/^[-*•→‣⁃▪▸›»]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
      bullets.push(line);
    } else if (line.length < 120 && line.length > 10) {
      // Short lines not obviously section headers (not ALL CAPS short lines)
      const upper = line.replace(/[^a-zA-Z]/g, "").length;
      if (line.length > 0 && upper / line.length < 0.6) {
        bullets.push(line);
      }
    }
  }

  return bullets;
}

/** Find date-like patterns in text. */
function extractDates(text: string): string[] {
  const patterns = [
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi,
    /\b\d{1,2}\/\d{4}\b/g,
    /\b\d{4}\b/g,
  ];

  const results: string[] = [];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) results.push(...matches);
  }
  return results;
}

// ── Action Verbs Wordlist ──────────────────────────────────────────────────

const ACTION_VERBS = new Set([
  "achieved", "accelerated", "acquired", "administered", "advised", "advocated",
  "allocated", "analyzed", "applied", "architected", "assembled", "audited",
  "authored", "automated", "built", "calculated", "catalyzed", "chaired",
  "championed", "clarified", "coached", "collaborated", "compiled", "completed",
  "composed", "conceived", "concluded", "conducted", "consolidated", "constructed",
  "consulted", "coordinated", "created", "cultivated", "customized", "cut",
  "debugged", "decreased", "defined", "delegated", "delivered", "demonstrated",
  "deployed", "designed", "determined", "developed", "devised", "diagnosed",
  "directed", "discovered", "documented", "doubled", "drove", "earned",
  "edited", "educated", "eliminated", "enabled", "encouraged", "engineered",
  "established", "evaluated", "examined", "executed", "expanded", "expedited",
  "extracted", "facilitated", "figured", "filed", "finalized", "financed",
  "forecasted", "formulated", "founded", "generated", "grew", "guided",
  "hired", "identified", "illustrated", "implemented", "improved", "increased",
  "initiated", "innovated", "instituted", "integrated", "interpreted", "introduced",
  "invented", "investigated", "launched", "led", "maintained", "managed",
  "marketed", "measured", "mentored", "merged", "minimized", "modeled",
  "monitored", "motivated", "negotiated", "nurtured", "obtained", "operated",
  "optimized", "orchestrated", "ordered", "organized", "originated", "outpaced",
  "outsourced", "overhauled", "oversaw", "performed", "pioneered", "planned",
  "prepared", "presented", "prevented", "produced", "programmed", "projected",
  "promoted", "proposed", "protected", "provided", "published", "purchased",
  "qualified", "raised", "realized", "received", "recommended", "reconciled",
  "recorded", "recruited", "redesigned", "reduced", "reengineered", "refactored",
  "rehabilitated", "reorganized", "repaired", "replaced", "reported", "represented",
  "researched", "resolved", "responded", "restored", "restructured", "retained",
  "retrieved", "revamped", "reviewed", "revised", "revitalized", "scheduled",
  "screened", "secured", "selected", "shaped", "shortened", "simplified",
  "solved", "spearheaded", "standardized", "started", "stimulated", "streamlined",
  "strengthened", "structured", "succeeded", "summarized", "supervised", "surpassed",
  "surveyed", "synthesized", "systematized", "targeted", "taught", "tested",
  "trained", "transformed", "trimmed", "tripled", "uncovered", "undertook",
  "unified", "updated", "upgraded", "validated", "verbalized", "visualized",
  "won", "wrote", "wrought",
]);

// ── Individual Check Functions ─────────────────────────────────────────────

// ── U1. Contacts — Email ───────────────────────────────────────────────────

export function checkEmail(text: string): DeterministicCheck {
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  const matches = text.match(emailRegex);

  if (!matches || matches.length === 0) {
    return failed("D01", "contacts", "Email Address", "No email address found in the document.");
  }

  const validMatches = matches.filter(m => {
    const domain = m.split("@")[1]?.toLowerCase();
    return domain && !domain.startsWith("example");
  });

  if (validMatches.length === 0) {
    return warning("D01", "contacts", "Email Address", "Email found but uses a placeholder domain (e.g. example.com).", matches[0]);
  }

  return passed("D01", "contacts", "Email Address", `Email found: ${validMatches[0]}`, validMatches[0]);
}

// ── U2. Contacts — Phone ───────────────────────────────────────────────────

export function checkPhone(text: string): DeterministicCheck {
  // International phone patterns: +XX, 00XX, or common national formats
  const phoneWithPrefix = /(?:\+\d{1,3}|00\d{1,3})[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{2,4}/g;
  const phoneGeneric = /\b\d{3}[\s-.]?\d{3}[\s-.]?\d{4}\b/g;

  const withPrefix = text.match(phoneWithPrefix);
  const generic = text.match(phoneGeneric);

  // Deduplicate: if a prefixed match also satisfies generic, count it once
  const allPhones = [...(withPrefix || []), ...(generic || [])].filter(Boolean);

  if (allPhones.length === 0) {
    return failed("D02", "contacts", "Phone Number", "No phone number found.");
  }

  // Check if any have international prefix
  const hasPrefix = withPrefix && withPrefix.length > 0;

  if (!hasPrefix) {
    return warning("D02", "contacts", "Phone Number", "Phone number found but missing international prefix (e.g. +39).", allPhones[0]);
  }

  return passed("D02", "contacts", "Phone Number", `Phone found with international prefix.`, withPrefix![0]);
}

// ── U3. Contacts — LinkedIn, GitHub, Website, Location ─────────────────────

export function checkLinkedIn(text: string): DeterministicCheck {
  const regex = /linkedin\.com\/(?:in|pub|company)\/[a-zA-Z0-9_-]+/gi;
  const match = text.match(regex);
  if (match) {
    return passed("D03", "contacts", "LinkedIn URL", "LinkedIn profile found.", match[0]);
  }
  return failed("D03", "contacts", "LinkedIn URL", "No LinkedIn URL found. Recruiters often check LinkedIn.");
}

export function checkGitHub(text: string): DeterministicCheck {
  const regex = /github\.com\/[a-zA-Z0-9_-]+/gi;
  const match = text.match(regex);
  if (match) {
    return passed("D04", "contacts", "GitHub URL", "GitHub profile found.", match[0]);
  }
  return warning("D04", "contacts", "GitHub URL", "No GitHub URL found. Optional but recommended for tech roles.");
}

export function checkWebsite(text: string): DeterministicCheck {
  // URLs that are NOT linkedin/github
  const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&/=]*)/gi;
  const urls = text.match(urlRegex) || [];

  const personalUrls = urls.filter(u => {
    const lower = u.toLowerCase();
    return !lower.includes("linkedin.com") && !lower.includes("github.com");
  });

  // Also check for plain domains like "mariorossi.dev"
  const domainRegex = /\b[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}\b(?!\/)/g;
  const domains = text.match(domainRegex) || [];
  const personalDomains = domains.filter(d => {
    const lower = d.toLowerCase();
    return !lower.includes("linkedin") && !lower.includes("github") &&
      !lower.includes("gmail") && !lower.includes("outlook") &&
      !lower.includes("yahoo") && !lower.includes("hotmail");
  });

  if (personalUrls.length > 0) {
    return passed("D05", "contacts", "Personal Website / Portfolio", "Personal website found.", personalUrls[0]);
  }
  if (personalDomains.length > 0) {
    return warning("D05", "contacts", "Personal Website / Portfolio", "Possible domain found but not a full URL.", personalDomains[0]);
  }
  return warning("D05", "contacts", "Personal Website / Portfolio", "No personal website found. Optional but adds credibility.");
}

export function checkLocation(text: string): DeterministicCheck {
  // Look for location patterns: "City, Country", "City, State", timezone abbreviations
  const locationPatterns = [
    /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g,  // "Milan, Italy"
    /\b(?:GMT|UTC|EST|CST|PST|CET|EET|IST|JST)[+-]?\d{0,2}\b/g,              // Timezone abbreviations
    /\b(?:Remote|Hybrid|On-site|On site)\b/gi,                                // Work location type
  ];

  const matches: string[] = [];
  for (const p of locationPatterns) {
    const m = text.match(p);
    if (m) matches.push(...m);
  }

  if (matches.length > 0) {
    return passed("D08", "contacts", "Location / Timezone", "Location or timezone found.", matches[0]);
  }
  return failed("D08", "contacts", "Location / Timezone", "No location or timezone found. Helps recruiters determine availability.");
}

// ── U4. Bullet — Action Verbs ──────────────────────────────────────────────

export function checkActionVerbs(text: string): DeterministicCheck {
  const bullets = extractBullets(text);

  if (bullets.length === 0) {
    return warning("B01", "bullet_quality", "Action Verbs", "No bullet points detected. Could not analyse action verbs.");
  }

  // Lowercase the first word of each bullet
  const weakBullets: string[] = [];
  let strongCount = 0;

  for (const bullet of bullets) {
    const firstWord = bullet.replace(/^[-*•→‣⁃▪▸›»\s\d.)]+/, "").split(/\s+/)[0]?.toLowerCase();
    if (!firstWord) continue;

    if (ACTION_VERBS.has(firstWord)) {
      strongCount++;
    } else {
      weakBullets.push(bullet.substring(0, 60));
    }
  }

  const ratio = strongCount / bullets.length;

  if (ratio >= 0.7) {
    return passed("B01", "bullet_quality", "Action Verbs", `${strongCount}/${bullets.length} bullets use strong action verbs.`);
  } else if (ratio >= 0.4) {
    return warning("B01", "bullet_quality", "Action Verbs", `${strongCount}/${bullets.length} bullets use strong action verbs. Try to start more bullets with impact verbs.`,
      `Weak: "${weakBullets[0]}${weakBullets.length > 1 ? `" (+${weakBullets.length - 1} more)` : ""}"`);
  } else {
    return failed("B01", "bullet_quality", "Action Verbs", `Only ${strongCount}/${bullets.length} bullets use strong action verbs. Most start weakly.`,
      `Weak: "${weakBullets[0]}${weakBullets.length > 1 ? `" (+${weakBullets.length - 1} more)` : ""}"`);
  }
}

// ── U5. Bullet — Length & Metrics ──────────────────────────────────────────

export function checkBulletLength(text: string): DeterministicCheck {
  const bullets = extractBullets(text);
  if (bullets.length === 0) {
    return warning("B02", "bullet_quality", "Bullet Point Length", "No bullet points detected.");
  }

  const shortBullets = bullets.filter(b => b.split(/\s+/).length < 10);
  const longBullets = bullets.filter(b => b.split(/\s+/).length > 40);

  if (shortBullets.length > 0 && longBullets.length > 0) {
    return warning("B02", "bullet_quality", "Bullet Point Length",
      `${shortBullets.length} too short (<10 words), ${longBullets.length} too long (>40 words).`,
      `Short: "${shortBullets[0].substring(0, 40)}..."`);
  } else if (shortBullets.length > 0) {
    return warning("B02", "bullet_quality", "Bullet Point Length",
      `${shortBullets.length} bullet(s) are too short (<10 words). Add more detail.`,
      `Short: "${shortBullets[0].substring(0, 40)}..."`);
  } else if (longBullets.length > 0) {
    return warning("B02", "bullet_quality", "Bullet Point Length",
      `${longBullets.length} bullet(s) are too long (>40 words). Try to be more concise.`,
      `Long: "${longBullets[0].substring(0, 60)}..."`);
  }

  return passed("B02", "bullet_quality", "Bullet Point Length", `All ${bullets.length} bullets have a good length (10-40 words).`);
}

export function checkMetrics(text: string): DeterministicCheck {
  const bullets = extractBullets(text);
  if (bullets.length === 0) {
    return warning("B03", "bullet_quality", "Measurable Metrics", "No bullet points detected.");
  }

  const metricPattern = /[€$£%\d,]+|increased|decreased|reduced|grew|improved|generated|delivered|managed|led|achieved|saved|raised|boosted|doubled|tripled/gi;
  const bulletsWithMetrics = bullets.filter(b => metricPattern.test(b));

  const ratio = bulletsWithMetrics.length / bullets.length;

  if (ratio >= 0.5) {
    return passed("B03", "bullet_quality", "Measurable Metrics",
      `${bulletsWithMetrics.length}/${bullets.length} bullets include measurable impact.`);
  } else if (ratio >= 0.25) {
    return warning("B03", "bullet_quality", "Measurable Metrics",
      `Only ${bulletsWithMetrics.length}/${bullets.length} bullets include metrics. Quantify achievements with numbers.`);
  } else {
    return failed("B03", "bullet_quality", "Measurable Metrics",
      `Only ${bulletsWithMetrics.length}/${bullets.length} bullets include metrics. Add % growth, \$ revenue, or team size.`);
  }
}

// ── U6. Structure — Sections & Dates ───────────────────────────────────────

const STANDARD_SECTIONS = [
  "experience", "work experience", "employment", "professional experience",
  "education", "academic", "training",
  "skills", "core competencies", "technical skills", "key skills",
  "summary", "professional summary", "profile", "about me", "objective",
  "projects", "certifications", "certificates", "languages", "publications",
];

export function checkSections(text: string): DeterministicCheck {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const section of STANDARD_SECTIONS) {
    // Match section headers (possibly preceded by newline or at start)
    const regex = new RegExp(`(?:^|\\n)\\s*${section.replace(/ /g, "\\s+")}\\s*[:\\n]`, "i");
    if (regex.test(lower)) {
      found.push(section.charAt(0).toUpperCase() + section.slice(1));
    }
  }

  if (found.length >= 4) {
    return passed("S01", "structure", "Standard Sections",
      `${found.length} standard CV sections detected: ${found.slice(0, 4).join(", ")}.`);
  } else if (found.length >= 2) {
    return warning("S01", "structure", "Standard Sections",
      `Only ${found.length} standard sections detected (${found.join(", ")}). Consider adding more structure.`);
  } else if (found.length > 0) {
    return failed("S01", "structure", "Standard Sections",
      `Only ${found.length} standard section(s) detected: ${found.join(", ")}. ATS systems expect clear sections.`);
  } else {
    return failed("S01", "structure", "Standard Sections",
      "No standard CV sections detected. ATS systems may not parse this correctly.");
  }
}

export function checkDates(text: string): DeterministicCheck {
  const dates = extractDates(text);

  if (dates.length >= 2) {
    return passed("S02", "structure", "Dates & Timeline",
      `${dates.length} date references found. Timeline is well-documented.`, dates.slice(0, 3).join(", "));
  } else if (dates.length === 1) {
    return warning("S02", "structure", "Dates & Timeline",
      "Only 1 date reference found. Consider adding more dates to establish your timeline.", dates[0]);
  } else {
    return failed("S02", "structure", "Dates & Timeline",
      "No date references found. ATS systems require dates for each role.");
  }
}

export function checkDateGaps(text: string): DeterministicCheck {
  // Basic gap detection: look for year ranges like "2018 – 2020"
  const yearRangeRegex = /\b(18|19|20)\d{2}\s*[–\-to]+\s*(?:Present|Current|Now|(?:18|19|20)\d{2})\b/gi;
  const ranges = text.match(yearRangeRegex);

  if (!ranges || ranges.length === 0) {
    // Can't reliably detect gaps without structured data
    return passed("S03", "structure", "Employment Gaps",
      "No obvious gaps detected in date ranges.");
  }

  // Check for single-year entries that suggest a gap
  for (const range of ranges) {
    const years = range.match(/\b(18|19|20)\d{2}\b/g);
    if (years && years.length === 2) {
      const gap = parseInt(years[1]) - parseInt(years[0]);
      if (gap > 2) {
        return warning("S03", "structure", "Employment Gaps",
          `Detected a ${gap}-year gap between ${years[0]} and ${years[1]}. Consider explaining it.`,
          range);
      }
    }
  }

  return passed("S03", "structure", "Employment Gaps",
    "No significant gaps (>2 years) detected in date ranges.");
}

export function checkRecentEndDate(text: string): DeterministicCheck {
  // Check if recent roles lack an end date (and don't say "Present")
  const recentRolePattern = /\b(20\d{2})\s*[–\-to]+\s*(?!Present|Current|Now)(?:\s*$|\n)/gi;
  const incomplete = text.match(recentRolePattern);

  if (incomplete && incomplete.length > 0) {
    return warning("S04", "structure", "Recent Roles Without End Date",
      `${incomplete.length} role(s) have a start date but no end date (and don't say "Present").`,
      incomplete[0].trim());
  }

  return passed("S04", "structure", "Recent Roles Without End Date",
    "All roles have clear end dates or are marked as current.");
}

// ── U7. ATS-Specific — Special Chars, Skills, File Name ────────────────────

export function checkSpecialChars(text: string): DeterministicCheck {
  // Detect emoji and non-standard Unicode
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{200D}\u{FE0F}]/gu;
  const emojis = text.match(emojiRegex);

  // Detect special Unicode symbols often used in decorative headers
  const specialSymbols = /[^\x00-\x7F]/g;
  const nonAscii = text.match(specialSymbols);

  if (emojis && emojis.length > 0) {
    return warning("A01", "ats_specific", "Special Characters / Emoji",
      `${emojis.length} emoji found in the document. Many ATS systems cannot parse emoji.`,
      `Found: ${emojis.slice(0, 3).join(" ")}`);
  }

  if (nonAscii && nonAscii.length > 3) {
    return warning("A01", "ats_specific", "Special Characters / Emoji",
      `${nonAscii.length} non-ASCII characters found. May cause ATS parsing issues.`);
  }

  return passed("A01", "ats_specific", "Special Characters / Emoji",
    "No problematic characters detected.");
}

export function checkSkillsFormat(text: string): DeterministicCheck {
  const lower = text.toLowerCase();

  // Look for a skills section
  const skillsSection = lower.match(/(?:skills|core competencies|technical skills)[:\s]*([\s\S]*?)(?:\n\s*(?:experience|education|summary|projects|certifications|about|profile))/i);
  if (!skillsSection) {
    return warning("A02", "ats_specific", "Skills Parsability",
      "No dedicated skills section detected. ATS systems prefer a clear skills list.");
  }

  const skillsContent = skillsSection[1].trim();
  if (!skillsContent || skillsContent.length < 5) {
    return warning("A02", "ats_specific", "Skills Parsability",
      "Skills section appears empty or too short.");
  }

  // Check if skills appear to be in a parsable format
  const commaSeparated = skillsContent.split(",").length > 1;
  const semicolonSeparated = skillsContent.split(";").length > 1;
  const bulletList = (skillsContent.match(/^[-*•]/m)) !== null;
  const lineSeparated = skillsContent.split("\n").filter(l => l.trim().length > 0).length > 1;

  if (commaSeparated || semicolonSeparated || bulletList || lineSeparated) {
    return passed("A02", "ats_specific", "Skills Parsability",
      "Skills appear in a parsable format (comma, semicolon, or list).");
  }

  return warning("A02", "ats_specific", "Skills Parsability",
    "Skills may not be in a clearly parsable format. Use commas or a bullet list.");
}

export function checkFileName(fileName?: string): DeterministicCheck {
  if (!fileName) {
    return warning("A03", "ats_specific", "File Name",
      "File name unknown. Consider naming your file professionally (e.g. Mario_Rossi_CV_2026.pdf).");
  }

  const lower = fileName.toLowerCase();

  if (lower === "resume.pdf" || lower === "cv.pdf" || lower === "resume" || lower === "cv") {
    return warning("A03", "ats_specific", "File Name",
      `File name "${fileName}" is very generic. Use a professional name like "FirstName_LastName_CV.pdf".`,
      fileName);
  }

  // Check for spaces or special chars in filename
  if (/[\s#%&{}]/.test(fileName)) {
    return warning("A03", "ats_specific", "File Name",
      `File name contains spaces or special characters. Some ATS systems may struggle with this.`,
      fileName);
  }

  return passed("A03", "ats_specific", "File Name",
    `File name "${fileName}" looks professional.`, fileName);
}

// ── U8. Runner ─────────────────────────────────────────────────────────────

const ALL_CHECKS: Array<(text: string, fileName?: string) => DeterministicCheck> = [
  // Contacts
  checkEmail,
  checkPhone,
  checkLinkedIn,
  checkGitHub,
  checkWebsite,
  checkLocation,
  // Bullet quality
  checkActionVerbs,
  checkBulletLength,
  checkMetrics,
  // Structure
  checkSections,
  checkDates,
  checkDateGaps,
  checkRecentEndDate,
  // ATS-specific
  checkSpecialChars,
  checkSkillsFormat,
  checkFileName,
];

/**
 * Run all deterministic checks on extracted PDF text.
 * @param text - Text extracted from the PDF.
 * @param fileName - Original file name (for file-naming check).
 */
export function runAllChecks(text: string, fileName?: string): RulesResult {
  const checks = ALL_CHECKS.map(check => check(text, fileName));

  const passedCount = checks.filter(c => c.status === "passed").length;
  const total = checks.length;
  const lintScore = Math.round((passedCount / total) * 100);

  return { checks, lintScore };
}
