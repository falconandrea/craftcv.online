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
  /**
   * Informational checks never move the lint score: their own message says
   * "optional", so penalising them would contradict the advice.
   */
  informational?: boolean;
}

export interface RulesResult {
  checks: DeterministicCheck[];
  /** 0-100 weighted score: passed = 1, warning = 0.5, failed = 0. */
  lintScore: number;
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

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const URL_RE = /https?:\/\/\S+|\b(?:www|linkedin|github)\.[a-z]/i;
/** Phone-shaped: an international prefix, or three separated digit groups. */
const PHONE_SHAPE_RE = /(?:\+|\b00)\d[\d\s.\-/()]{6,}|\b\(?\d{2,4}\)?[\s.\-]\d{2,4}[\s.\-]\d{2,4}\b/;
const MONTH_WORD_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\b/gi;

/** Page numbers, rule lines and other artefacts of PDF text extraction. */
function isLayoutNoise(line: string): boolean {
  if (/^[-–—]{2,}\s*(?:\d+\s*(?:of\s*\d+)?)?\s*[-–—]{2,}$/i.test(line)) return true; // "-- 1 of 1 --"
  if (/^(?:page\s*)?\d+\s*(?:of\s*\d+)?$/i.test(line)) return true;                  // "Page 1" / "1 of 1"
  if (/^[-–—_=]{3,}$/.test(line)) return true;                                       // "---" rule
  if (/^[•·⋅.]{2,}$/.test(line)) return true;                                        // "•••" / "..." rule
  return false;
}

/** A line that is only a date or a date range ("Jan 2020 – Present", "2016 – 2020"). */
function isDateOnlyLine(line: string): boolean {
  if (!/\d/.test(line)) return false;
  const rest = line
    .replace(MONTH_WORD_RE, "")
    .replace(/\b(?:present|current|now|today|ongoing|to|until|since)\b/gi, "")
    .replace(/[^a-zA-Z]/g, "");
  return rest.length < 4;
}

/** A contact / header line: email, URL or phone number. Never a bullet. */
function isContactLine(line: string): boolean {
  return EMAIL_RE.test(line) || URL_RE.test(line) || PHONE_SHAPE_RE.test(line);
}

/** Mostly-uppercase lines are section headings, not bullets. */
function isMostlyUppercase(line: string): boolean {
  const letters = line.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return false;
  const upper = line.replace(/[^A-Z]/g, "").length;
  return upper / letters.length >= 0.6;
}

// The space after the glyph is optional: PDF text extraction often glues the
// bullet to the first word ("•Led a team..."). A letter must follow, so a
// line starting with "-40% churn" is not read as a bullet.
const BULLET_MARKER_RE = /^[-*•→‣⁃▪▸●○◦›»][ \t]*(?=[A-Za-z])/;
const NUMBERED_MARKER_RE = /^\d+[.)]\s+/;

/** Remove the leading bullet glyph / list number from a line. */
export function stripBulletMarker(line: string): string {
  return line.replace(BULLET_MARKER_RE, "").replace(NUMBERED_MARKER_RE, "").trim();
}

/**
 * Extract the achievement lines from a CV.
 *
 * Strategy: if the document has explicit bullet glyphs, trust them and use
 * nothing else — that is the only reliable signal. Only when a CV has no
 * glyphs at all do we fall back to a prose heuristic, which deliberately
 * excludes headings, contact lines and bare date ranges so that the bullet
 * checks are not measured against a denominator of metadata.
 */
export function extractBullets(text: string): string[] {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !isLayoutNoise(l));

  const explicit = lines.filter(l => BULLET_MARKER_RE.test(l) || NUMBERED_MARKER_RE.test(l));
  if (explicit.length >= 2) return explicit;

  return lines.filter(line => {
    if (line.length < 20 || line.length > 400) return false;
    // Sentence-length only: 8+ real words. Job-title and company lines
    // ("Acme Corp — Senior Engineer") are shorter than any real achievement.
    const words = line.split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w));
    if (words.length < 8) return false;
    if (isMostlyUppercase(line)) return false;
    if (isContactLine(line)) return false;
    if (isDateOnlyLine(line)) return false;
    if (/[:;]$/.test(line)) return false; // trailing colon → heading
    return true;
  });
}

// ── Date parsing ───────────────────────────────────────────────────────────

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const MONTH_ALT = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

/** Find date-like patterns in text. */
function extractDates(text: string): string[] {
  const patterns = [
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/gi,
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

interface MonthRange {
  /** Absolute month index (year * 12 + month), inclusive. */
  start: number;
  end: number;
  label: string;
}

function monthIndexOf(token: string | undefined): number | undefined {
  if (!token) return undefined;
  const key = token.slice(0, 3).toLowerCase();
  return key in MONTH_INDEX ? MONTH_INDEX[key] : undefined;
}

/**
 * Parse every "start – end" date range in the text.
 * Year-only bounds are widened (start = January, end = December) so that
 * "2018 – 2020" followed by "2020 – 2022" reads as continuous instead of
 * inventing a gap.
 */
export function parseDateRanges(text: string, now = new Date()): MonthRange[] {
  const bound = String.raw`(?:(${MONTH_ALT})[a-z]*\.?\s+)?(\d{4})`;
  const re = new RegExp(
    `${bound}\\s*(?:[–—-]{1,2}|\\bto\\b|\\buntil\\b)\\s*(?:(present|current|now|today|ongoing)|${bound})`,
    "gi"
  );

  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  const minYear = 1950;
  const maxYear = now.getFullYear() + 1;
  const ranges: MonthRange[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [full, startMonthTok, startYearTok, presentTok, endMonthTok, endYearTok] = m;

    const startYear = Number(startYearTok);
    if (startYear < minYear || startYear > maxYear) continue;

    const startMonth = monthIndexOf(startMonthTok);
    const start = startYear * 12 + (startMonth ?? 0);

    let end: number;
    if (presentTok) {
      end = currentMonth;
    } else {
      const endYear = Number(endYearTok);
      if (!endYear || endYear < minYear || endYear > maxYear) continue;
      const endMonth = monthIndexOf(endMonthTok);
      end = endYear * 12 + (endMonth ?? 11);
    }

    if (end < start) continue;
    ranges.push({ start, end, label: full.trim().replace(/\s+/g, " ") });
  }

  return ranges.sort((a, b) => a.start - b.start);
}

/** Merge overlapping / touching ranges so education and jobs do not fake gaps. */
function mergeRanges(ranges: MonthRange[]): MonthRange[] {
  const merged: MonthRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end + 1) {
      last.end = Math.max(last.end, r.end);
      last.label = `${last.label} / ${r.label}`;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

function formatMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[month]} ${year}`;
}

// ── Action Verbs Wordlist ──────────────────────────────────────────────────

const ACTION_VERBS = new Set([
  "achieved", "accelerated", "acquired", "administered", "advised", "advocated",
  "allocated", "analyzed", "analysed", "applied", "architected", "assembled", "audited",
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
  "marketed", "measured", "mentored", "merged", "migrated", "minimized", "modeled",
  "monitored", "motivated", "negotiated", "nurtured", "obtained", "operated",
  "optimized", "optimised", "orchestrated", "ordered", "organized", "originated", "outpaced",
  "outsourced", "overhauled", "oversaw", "performed", "pioneered", "planned",
  "prepared", "presented", "prevented", "produced", "programmed", "projected",
  "promoted", "proposed", "protected", "provided", "published", "purchased",
  "qualified", "raised", "realized", "received", "recommended", "reconciled",
  "recorded", "recruited", "redesigned", "reduced", "reengineered", "refactored",
  "rehabilitated", "reorganized", "repaired", "replaced", "reported", "represented",
  "researched", "resolved", "responded", "restored", "restructured", "retained",
  "retrieved", "revamped", "reviewed", "revised", "revitalized", "scaled", "scheduled",
  "screened", "secured", "selected", "shaped", "shipped", "shortened", "simplified",
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

/** Count digits in a candidate match. */
function digitCount(s: string): number {
  return (s.match(/\d/g) || []).length;
}

export function checkPhone(text: string): DeterministicCheck {
  // International: +39 333 123 4567 / 0039 333 1234567
  const prefixedRe = /(?:\+|\b00)\d{1,3}[\s.\-/]?\(?\d{2,4}\)?[\s.\-/]?\d{2,4}[\s.\-/]?\d{0,4}/g;
  // National: three digit groups with explicit separators (123-456-7890).
  // Separators are required so that VAT numbers, IDs and year ranges do not match.
  const nationalRe = /\b\(?\d{2,4}\)?[\s.\-]\d{2,4}[\s.\-]\d{2,4}\b/g;

  const plausible = (candidates: string[]) =>
    candidates.filter(c => {
      const digits = digitCount(c);
      if (digits < 7 || digits > 15) return false;
      if (/^\d{4}\s*[–—-]\s*\d{4}$/.test(c.trim())) return false; // "2018 - 2020"
      return true;
    });

  const withPrefix = plausible(text.match(prefixedRe) || []);
  const national = plausible(text.match(nationalRe) || []);

  if (withPrefix.length === 0 && national.length === 0) {
    return failed("D02", "contacts", "Phone Number", "No phone number found.");
  }

  if (withPrefix.length === 0) {
    return warning("D02", "contacts", "Phone Number", "Phone number found but missing international prefix (e.g. +39).", national[0].trim());
  }

  return passed("D02", "contacts", "Phone Number", "Phone found with international prefix.", withPrefix[0].trim());
}

// ── U3. Contacts — LinkedIn, GitHub, Website, Location ─────────────────────

export function checkLinkedIn(text: string): DeterministicCheck {
  // Full URL
  const fullRegex = /linkedin\.com\/(?:in|pub|company)\/[a-zA-Z0-9_-]+/gi;
  const fullMatch = text.match(fullRegex);

  if (fullMatch) {
    return passed("D03", "contacts", "LinkedIn URL", "LinkedIn profile found.", fullMatch[0]);
  }

  // Abbreviated: "/in/username" (common in PDF headers)
  const shortRegex = /\/in\/([a-zA-Z0-9_-]+)/g;
  const shortMatch = shortRegex.exec(text);
  if (shortMatch) {
    return passed("D03", "contacts", "LinkedIn URL", "LinkedIn profile found (abbreviated).", `/in/${shortMatch[1]}`);
  }

  return failed("D03", "contacts", "LinkedIn URL", "No LinkedIn URL found. Recruiters often check LinkedIn.");
}

export function checkGitHub(text: string): DeterministicCheck {
  // Full URL: github.com/username
  const fullRegex = /github\.com\/[a-zA-Z0-9_-]+/gi;
  const fullMatch = text.match(fullRegex);

  if (fullMatch) {
    return passed("D04", "contacts", "GitHub URL", "GitHub profile found.", fullMatch[0]);
  }

  // Abbreviated: "github: username" or "github - username" (require punctuation)
  const shortRegex = /\bgithub\s*[:•·-]+\s*(?:@)?([a-zA-Z0-9][a-zA-Z0-9_]{1,30})\b/gi;
  const shortMatch = shortRegex.exec(text);
  if (shortMatch) {
    return passed("D04", "contacts", "GitHub URL", "GitHub profile found (abbreviated).", shortMatch[1]);
  }

  return warning("D04", "contacts", "GitHub URL", "No GitHub URL found. Optional but recommended for tech roles.");
}

const WEB_TLDS = new Set([
  "com", "org", "net", "io", "dev", "app", "me", "co", "uk", "it", "fr",
  "de", "es", "eu", "gov", "edu", "info", "ai", "ly", "pro", "xyz",
  "tech", "design", "studio", "page", "site", "blog", "cloud",
]);

// Technology/library names that look like domains but aren't
const TECH_FALSE_POSITIVES = new Set([
  "next.js", "react.js", "node.js", "vue.js", "angular.js", "express.js",
  "three.js", "jquery", "chart.js", "d3.js", "p5.js", "socket.io",
  "redux.js", "meteor.js", "svelte.js", "ember.js", "backbone.js",
  "nest.js", "nuxt.js", "remix.run", "vite.dev", "deno.land",
]);

const EMAIL_PROVIDER_HINTS = ["gmail", "outlook", "yahoo", "hotmail", "icloud", "proton", "libero", "live"];

export function checkWebsite(text: string): DeterministicCheck {
  // Full URLs with protocol
  const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&/=]*)/gi;
  const urls = text.match(urlRegex) || [];

  const personalUrls = urls.filter(u => {
    const l = u.toLowerCase();
    return !l.includes("linkedin.com") && !l.includes("github.com");
  });

  if (personalUrls.length > 0) {
    return passed("D05", "contacts", "Personal Website / Portfolio", "Personal website found.", personalUrls[0]);
  }

  // Plain domains like "mariorossi.dev" — only match with common web TLDs
  const domainRegex = /\b[a-zA-Z0-9][a-zA-Z0-9-]+\.([a-zA-Z]{2,6})\b(?!\/)/g;
  let domainMatch: RegExpExecArray | null;
  const personalDomains: string[] = [];

  while ((domainMatch = domainRegex.exec(text)) !== null) {
    const tld = domainMatch[1].toLowerCase();
    const full = domainMatch[0].toLowerCase();

    // Skip the domain part of an email address (mario@rossi.dev) and any
    // fragment of a longer host (sub.example.com already matched above).
    const prev = domainMatch.index > 0 ? text[domainMatch.index - 1] : "";
    if (prev === "@" || prev === ".") continue;

    // Skip false positives (tech names, common email domains)
    if (TECH_FALSE_POSITIVES.has(full)) continue;
    if (full.includes("linkedin") || full.includes("github")) continue;
    if (EMAIL_PROVIDER_HINTS.some(p => full.includes(p))) continue;

    if (WEB_TLDS.has(tld)) {
      personalDomains.push(domainMatch[0]);
    }
  }

  if (personalDomains.length > 0) {
    return passed("D05", "contacts", "Personal Website / Portfolio",
      "Personal website found (bare domain). Adding https:// makes it clickable in most ATS previews.",
      personalDomains[0]);
  }
  return warning("D05", "contacts", "Personal Website / Portfolio", "No personal website found. Optional but adds credibility.");
}

const KNOWN_COUNTRIES = new Set([
  "italy", "italia", "usa", "uk", "germany", "france", "spain", "portugal", "netherlands",
  "belgium", "switzerland", "austria", "sweden", "norway", "denmark", "finland",
  "ireland", "poland", "czech", "slovakia", "hungary", "romania", "bulgaria",
  "greece", "turkey", "japan", "china", "india", "brazil", "argentina", "mexico",
  "canada", "australia", "new zealand", "singapore", "malaysia", "indonesia",
  "thailand", "vietnam", "philippines", "south korea", "israel", "uae",
  "united states", "united kingdom", "south africa", "russia", "ukraine",
]);

const KNOWN_CITIES = new Set([
  "milan", "milano", "rome", "roma", "turin", "torino", "florence", "firenze",
  "naples", "napoli", "venice", "venezia", "bologna", "genoa", "genova",
  "london", "paris", "berlin", "munich", "hamburg", "madrid", "barcelona",
  "amsterdam", "brussels", "zurich", "geneva", "stockholm", "oslo", "copenhagen",
  "helsinki", "dublin", "warsaw", "prague", "budapest", "vienna", "lisbon",
  "new york", "san francisco", "los angeles", "chicago", "seattle", "boston",
  "austin", "denver", "portland", "miami", "atlanta", "washington",
  "toronto", "vancouver", "montreal", "sydney", "melbourne", "tokyo",
  "seoul", "singapore", "hong kong", "shanghai", "beijing", "bangkok",
  "dubai", "mumbai", "bangalore", "são paulo", "sao paulo", "buenos aires",
]);

const US_STATES = new Set([
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
  "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
  "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
  "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
  "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
]);

// Matched case-sensitively: lowercase "est" / "ist" are ordinary words in
// several languages, uppercase "EST" / "IST" are timezones.
const TIMEZONE_ABBREVS = ["GMT", "UTC", "EST", "CST", "PST", "CET", "CEST", "EET", "IST", "JST"];

export function checkLocation(text: string): DeterministicCheck {
  const matches: string[] = [];

  // Pattern 1: "City, Country" — limit city to 1-2 words to avoid greedy grabs
  const cityCountryRegex = /(?:^|[\n\r\t •|])([A-Z][a-zà-ÿ]+(?:[ \t][A-Z][a-zà-ÿ]+)?),[ \t]*([A-Za-zà-ÿ]+(?:[ \t][A-Za-zà-ÿ]+)*)/g;
  let m: RegExpExecArray | null;
  while ((m = cityCountryRegex.exec(text)) !== null) {
    const city = m[1].toLowerCase();
    const country = m[2].toLowerCase();
    if (KNOWN_COUNTRIES.has(country) || KNOWN_CITIES.has(city)) {
      matches.push(`${m[1]}, ${m[2]}`);
    }
  }

  // Pattern 2: "City, ST" (US state abbreviation)
  const cityStateRegex = /([A-Z][a-z]+(?:[ \t][A-Z][a-z]+)?),[ \t]*([A-Z]{2})\b/g;
  let m2: RegExpExecArray | null;
  while ((m2 = cityStateRegex.exec(text)) !== null) {
    if (US_STATES.has(m2[2].toLowerCase())) {
      matches.push(`${m2[1]}, ${m2[2]}`);
    }
  }

  // Pattern 3: uppercase timezone abbreviations
  for (const tz of TIMEZONE_ABBREVS) {
    const tzRegex = new RegExp(`\\b${tz}(?:[+-]\\d{1,2})?\\b`, "g");
    const tzMatch = text.match(tzRegex);
    if (tzMatch) matches.push(...tzMatch);
  }

  if (matches.length > 0) {
    return passed("D08", "contacts", "Location / Timezone", "Location or timezone found.", matches[0]);
  }

  // A work-location preference alone does not tell a recruiter where you are.
  const workTypeRegex = /\b(?:Remote|Hybrid|On-site|On site)\b/i;
  if (workTypeRegex.test(text)) {
    return warning("D08", "contacts", "Location / Timezone",
      "Only a work preference (remote / hybrid) found, no city or timezone. Add both so recruiters can check availability.");
  }

  return failed("D08", "contacts", "Location / Timezone", "No location or timezone found. Helps recruiters determine availability.");
}

// ── U4. Bullet — Action Verbs ──────────────────────────────────────────────

export function checkActionVerbs(text: string): DeterministicCheck {
  const bullets = extractBullets(text);

  if (bullets.length === 0) {
    return warning("B01", "bullet_quality", "Action Verbs", "No bullet points detected. Could not analyse action verbs.");
  }

  const weakBullets: string[] = [];
  let strongCount = 0;

  for (const bullet of bullets) {
    const firstWord = stripBulletMarker(bullet).split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    if (!firstWord) continue;

    if (ACTION_VERBS.has(firstWord)) {
      strongCount++;
    } else {
      weakBullets.push(stripBulletMarker(bullet).substring(0, 60));
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

  const wordCount = (b: string) => stripBulletMarker(b).split(/\s+/).filter(Boolean).length;
  const shortBullets = bullets.filter(b => wordCount(b) < 10);
  const longBullets = bullets.filter(b => wordCount(b) > 40);

  if (shortBullets.length > 0 && longBullets.length > 0) {
    return warning("B02", "bullet_quality", "Bullet Point Length",
      `${shortBullets.length} too short (<10 words), ${longBullets.length} too long (>40 words).`,
      `Short: "${stripBulletMarker(shortBullets[0]).substring(0, 40)}..."`);
  } else if (shortBullets.length > 0) {
    return warning("B02", "bullet_quality", "Bullet Point Length",
      `${shortBullets.length} bullet(s) are too short (<10 words). Add more detail.`,
      `Short: "${stripBulletMarker(shortBullets[0]).substring(0, 40)}..."`);
  } else if (longBullets.length > 0) {
    return warning("B02", "bullet_quality", "Bullet Point Length",
      `${longBullets.length} bullet(s) are too long (>40 words). Try to be more concise.`,
      `Long: "${stripBulletMarker(longBullets[0]).substring(0, 60)}..."`);
  }

  return passed("B02", "bullet_quality", "Bullet Point Length", `All ${bullets.length} bullets have a good length (10-40 words).`);
}

/**
 * Quantified-impact patterns. Deliberately narrow: a bare comma or a stray
 * year is not a metric. All patterns are non-global so that `test()` never
 * carries `lastIndex` state between bullets.
 */
const METRIC_UNITS = [
  "users", "customers", "clients", "accounts", "people", "employees", "engineers",
  "developers", "designers", "students", "reports", "stakeholders", "teams",
  "hours", "days", "weeks", "months", "years", "sprints",
  "requests", "queries", "events", "records", "rows", "transactions", "orders",
  "tickets", "issues", "bugs", "features", "releases", "deploys", "deployments",
  "countries", "markets", "regions", "stores", "sites", "projects", "products",
  "languages", "repositories", "repos", "services", "microservices", "endpoints",
].join("|");

const METRIC_PATTERNS: RegExp[] = [
  /\d+(?:[.,]\d+)?\s*%/,                                          // 40%
  /\b\d+(?:[.,]\d+)?\s*(?:percent|percentage points|pp)\b/i,      // 50 percent
  /[€$£¥]\s?\d/,                                                  // $2M
  /\b\d+(?:[.,]\d+)?\s*(?:k|m|bn|mln|thousand|million|billion)\b/i, // 10k, 2M
  /\b\d+(?:[.,]\d+)?\s*x\b/i,                                     // 3x
  new RegExp(String.raw`\b(?:team|group|squad|crew|staff)\s+of\s+\d+`, "i"),
  new RegExp(String.raw`\b\d+(?:[.,]\d+)?\s+(?:[a-z]+\s+){0,2}(?:${METRIC_UNITS})\b`, "i"),
  /\b(?:doubled|tripled|quadrupled|halved)\b/i,
];

export function checkMetrics(text: string): DeterministicCheck {
  const bullets = extractBullets(text);
  if (bullets.length === 0) {
    return warning("B03", "bullet_quality", "Measurable Metrics", "No bullet points detected.");
  }

  const bulletsWithMetrics = bullets.filter(b => {
    const body = stripBulletMarker(b);
    return METRIC_PATTERNS.some(p => p.test(body));
  });

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

/**
 * Canonical section groups. Aliases inside a group collapse to one hit, so a
 * CV with both "Skills" and "Technical Skills" is not credited twice.
 */
const SECTION_GROUPS: Array<{ name: string; aliases: string[] }> = [
  {
    name: "Experience",
    aliases: [
      "experience", "work experience", "professional experience", "employment",
      "employment history", "work history", "career history", "esperienza",
      "esperienze professionali", "esperienza lavorativa",
    ],
  },
  {
    name: "Education",
    aliases: ["education", "education & training", "academic", "academic background", "training", "istruzione", "formazione"],
  },
  {
    name: "Skills",
    aliases: [
      "skills", "technical skills", "key skills", "core skills", "core competencies",
      "competencies", "tech stack", "competenze", "competenze tecniche",
    ],
  },
  {
    name: "Summary",
    aliases: ["summary", "professional summary", "profile", "about", "about me", "objective", "profilo", "sommario"],
  },
  { name: "Projects", aliases: ["projects", "selected projects", "side projects", "progetti"] },
  { name: "Certifications", aliases: ["certifications", "certificates", "certification", "certificazioni"] },
  { name: "Languages", aliases: ["languages", "lingue"] },
  { name: "Publications", aliases: ["publications", "talks", "talks & publications", "pubblicazioni"] },
];

export function checkSections(text: string): DeterministicCheck {
  // Headings are their own line: normalise each line and match it whole, so
  // "Experience" inside a sentence is not mistaken for a section header.
  const lines = text
    .split("\n")
    .map(l => l.trim().toLowerCase().replace(/[:•·|\-–—_]+$/, "").trim())
    .filter(l => l.length > 0 && l.length <= 40);

  const found: string[] = [];
  for (const group of SECTION_GROUPS) {
    const hit = lines.some(line =>
      group.aliases.some(alias =>
        // Exact heading, or a heading with a short tail ("Skills & Tools").
        line === alias || (line.startsWith(alias) && line.length - alias.length <= 12)
      )
    );
    if (hit) found.push(group.name);
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

/** Gaps shorter than this are normal (notice periods, summer breaks). */
const GAP_THRESHOLD_MONTHS = 6;

export function checkDateGaps(text: string, _fileName?: string, now = new Date()): DeterministicCheck {
  const parsed = parseDateRanges(text, now);

  if (parsed.length < 2) {
    return warning("S03", "structure", "Employment Gaps",
      "Not enough date ranges to reconstruct a timeline, so gaps could not be checked. Write each role as \"Mon YYYY – Mon YYYY\".",
      parsed.length === 1 ? parsed[0].label : undefined);
  }

  // Overlapping ranges (a job and a degree running in parallel) are merged
  // first, otherwise every concurrent entry would read as a gap.
  const ranges = mergeRanges(parsed);

  const gaps: Array<{ from: number; to: number; months: number }> = [];
  for (let i = 1; i < ranges.length; i++) {
    const months = ranges[i].start - ranges[i - 1].end - 1;
    if (months > GAP_THRESHOLD_MONTHS) {
      gaps.push({ from: ranges[i - 1].end, to: ranges[i].start, months });
    }
  }

  if (gaps.length === 0) {
    return passed("S03", "structure", "Employment Gaps",
      `Timeline is continuous across ${parsed.length} date ranges (no gap longer than ${GAP_THRESHOLD_MONTHS} months).`);
  }

  const biggest = gaps.reduce((a, b) => (b.months > a.months ? b : a));
  return warning("S03", "structure", "Employment Gaps",
    `${gaps.length} gap(s) longer than ${GAP_THRESHOLD_MONTHS} months in the timeline. Gaps are fine — but label them (sabbatical, study, caregiving) so a parser does not read them as missing data.`,
    `Largest: ${biggest.months} months between ${formatMonth(biggest.from)} and ${formatMonth(biggest.to)}`);
}

export function checkRecentEndDate(text: string): DeterministicCheck {
  // Nothing to verify without dates — say so instead of claiming a pass.
  if (!/\b(?:19|20)\d{2}\b/.test(text)) {
    return warning("S04", "structure", "Recent Roles Without End Date",
      "No years found in the document, so end dates could not be checked.");
  }

  // A range whose end is missing: "2020 –" or "Jan 2020 to" at end of line.
  const dangling = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => new RegExp(`(?:(?:${MONTH_ALT})[a-z]*\\.?\\s+)?\\d{4}\\s*(?:[–—-]{1,2}|\\bto\\b|\\buntil\\b)\\s*$`, "i").test(l));

  if (dangling.length > 0) {
    return warning("S04", "structure", "Recent Roles Without End Date",
      `${dangling.length} role(s) have a start date but no end date (and don't say "Present").`,
      dangling[0]);
  }

  return passed("S04", "structure", "Recent Roles Without End Date",
    "All roles have clear end dates or are marked as current.");
}

// ── U7. ATS-Specific — Special Chars, Skills, File Name ────────────────────

/**
 * Characters that actually break text extraction, as opposed to "not Latin":
 * private-use glyphs (icon fonts), lone surrogates, box-drawing and block
 * elements from ASCII-art layouts, and U+FFFD, which is the extractor telling
 * us it already lost a character. Accented, Cyrillic, Greek and CJK letters
 * are legitimate and no longer flagged.
 *
 * U+2500-U+259F = box drawing + block elements, U+FFFD = replacement char.
 */
const PROBLEM_CHAR_RE = /[\p{Co}\p{Cs}─-▟�]/gu;

export function checkSpecialChars(text: string): DeterministicCheck {
  const emojis = [...text.matchAll(/\p{Extended_Pictographic}/gu)].map(m => m[0]);

  if (emojis.length > 0) {
    return warning("A01", "ats_specific", "Special Characters / Emoji",
      `${emojis.length} emoji found in the document. Many ATS systems cannot parse emoji.`,
      `Found: ${[...new Set(emojis)].slice(0, 3).join(" ")}`);
  }

  const problematic = [...text.matchAll(PROBLEM_CHAR_RE)].map(m => m[0]);

  if (problematic.length > 0) {
    const codes = [...new Set(problematic)]
      .slice(0, 3)
      .map(c => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`);
    return warning("A01", "ats_specific", "Special Characters / Emoji",
      `${problematic.length} character(s) that break text extraction found (icon-font glyphs, box drawing or already-lost characters).`,
      `Found: ${codes.join(" ")}`);
  }

  return passed("A01", "ats_specific", "Special Characters / Emoji",
    "No problematic characters detected.");
}

export function checkSkillsFormat(text: string): DeterministicCheck {
  const lower = text.toLowerCase();

  // Skills header must start its own line; capture until the next section.
  const skillsSection = lower.match(
    /(?:^|\n)[ \t]*(?:technical skills|key skills|core competencies|competenze tecniche|competenze|skills)[ \t]*:?[ \t]*\n?([\s\S]*?)(?:\n[ \t]*(?:experience|work experience|professional experience|employment|education|summary|projects|certifications|languages|publications|about|profile)\b|$)/
  );
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
  const bulletList = /^[-*•]/m.test(skillsContent);
  const lineSeparated = skillsContent.split("\n").filter(l => l.trim().length > 0).length > 1;

  if (commaSeparated || semicolonSeparated || bulletList || lineSeparated) {
    return passed("A02", "ats_specific", "Skills Parsability",
      "Skills appear in a parsable format (comma, semicolon, or list).");
  }

  return warning("A02", "ats_specific", "Skills Parsability",
    "Skills may not be in a clearly parsable format. Use commas or a bullet list.");
}

const GENERIC_FILE_NAMES = new Set(["resume", "cv", "curriculum", "curriculum vitae", "document", "untitled"]);
/** Draft markers a recruiter reads as carelessness: cv_final_v3(1).pdf */
const DRAFT_MARKER_RE = /(?:^|[\s_\-.])(?:final|finale|def|definitivo|new|nuovo|updated|aggiornato|copy|copia|draft|bozza|v\d+|\(\d+\))(?:$|[\s_\-.])/i;

export function checkFileName(_text: string, fileName?: string): DeterministicCheck {
  if (!fileName) {
    return warning("A03", "ats_specific", "File Name",
      "File name unknown. Consider naming your file professionally (e.g. Mario_Rossi_CV_2026.pdf).");
  }

  const base = fileName.replace(/\.pdf$/i, "");
  const display = fileName.length > 50 ? fileName.substring(0, 47) + "..." : fileName;

  if (GENERIC_FILE_NAMES.has(base.trim().toLowerCase())) {
    return warning("A03", "ats_specific", "File Name",
      `File name "${fileName}" is very generic. Use a professional name like "FirstName_LastName_CV.pdf".`);
  }

  if (DRAFT_MARKER_RE.test(base)) {
    return warning("A03", "ats_specific", "File Name",
      "File name contains a draft marker (final, v2, copy...). It parses fine, but a recruiter scanning an attachment list reads it as carelessness.",
      `File: ${display}`);
  }

  if (/[\s#%&{}]/.test(fileName)) {
    return warning("A03", "ats_specific", "File Name",
      "File name contains spaces or special characters. Some ATS systems may struggle with this.",
      `File: ${display}`);
  }

  return passed("A03", "ats_specific", "File Name",
    "File name looks professional.");
}

// ── U8. Runner ─────────────────────────────────────────────────────────────

type CheckFn = (text: string, fileName?: string) => DeterministicCheck;

/**
 * Every check, with the weight it carries in the lint score.
 * Weight 0 = informational: the check's own message calls it optional, so it
 * is reported but never subtracted (a non-tech CV without a GitHub profile is
 * not a worse CV).
 */
const ALL_CHECKS: Array<{ fn: CheckFn; weight: number }> = [
  // Contacts
  { fn: checkEmail, weight: 1 },
  { fn: checkPhone, weight: 1 },
  { fn: checkLinkedIn, weight: 1 },
  { fn: checkGitHub, weight: 0 },
  { fn: checkWebsite, weight: 0 },
  { fn: checkLocation, weight: 1 },
  // Bullet quality
  { fn: checkActionVerbs, weight: 1 },
  { fn: checkBulletLength, weight: 1 },
  { fn: checkMetrics, weight: 1 },
  // Structure
  { fn: checkSections, weight: 1 },
  { fn: checkDates, weight: 1 },
  { fn: checkDateGaps, weight: 1 },
  { fn: checkRecentEndDate, weight: 1 },
  // ATS-specific
  { fn: checkSpecialChars, weight: 1 },
  { fn: checkSkillsFormat, weight: 1 },
  { fn: checkFileName, weight: 1 },
];

const STATUS_SCORE: Record<CheckStatus, number> = {
  passed: 1,
  warning: 0.5,
  failed: 0,
};

/**
 * Run all deterministic checks on extracted PDF text.
 *
 * The lint score is weighted, not a raw pass count: a warning is half credit
 * (something to improve, not a broken CV) and informational checks are left
 * out of the denominator entirely.
 *
 * @param text - Text extracted from the PDF.
 * @param fileName - Original file name (for file-naming check).
 */
export function runAllChecks(text: string, fileName?: string): RulesResult {
  const checks: DeterministicCheck[] = [];
  let earned = 0;
  let total = 0;

  for (const { fn, weight } of ALL_CHECKS) {
    const check = fn(text, fileName);
    checks.push(weight === 0 ? { ...check, informational: true } : check);
    if (weight > 0) {
      earned += STATUS_SCORE[check.status] * weight;
      total += weight;
    }
  }

  const lintScore = total > 0 ? Math.round((earned / total) * 100) : 0;

  return { checks, lintScore };
}
