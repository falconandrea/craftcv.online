/**
 * Patch Validator — Core Grounding Engine
 *
 * Runs 4 post-LLM checks on proposed CV patches:
 * 1. Existing date/year protection (FR-03)
 * 2. Unsupported-addition flags (FR-05)
 * 3. Needs-Verification flagging (FR-08)
 * 4. Selected passive-opener warnings (FR-12)
 */

import type { CVState, CVPatch, ExperienceEntry, Education } from "@/state/types";
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
  // English closed-class function words (prepositions, conjunctions, articles,
  // pronouns, auxiliaries) — capitalized at sentence starts by orthography
  "of", "to", "by", "on", "at", "as", "an", "or", "not", "but", "this", "that",
  "these", "those", "is", "are", "was", "were", "be", "been", "being", "has",
  "have", "had", "do", "does", "did", "will", "would", "can", "could", "should",
  "than", "then", "so", "such", "both", "each", "all", "any", "some", "more",
  "most", "other", "within", "without", "between", "through", "during",
  "before", "after", "up", "down", "out", "while", "when", "where", "which",
  "who", "whom", "whose", "their", "our", "your", "its", "it", "we", "they",
  // Common components of hyphenated CV compounds ("Well-designed",
  // "Client-side", "Cross-functional", "Data-driven", "Open-source")
  "well", "side", "based", "oriented", "cross", "functional", "level", "state",
  "scale", "large", "real", "long", "short", "part", "open", "source", "front",
  "back", "third", "party", "free", "ready", "result", "results", "oriented",
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
  // Additional common CV action verbs (bullet-initial in English rewrites)
  "integrated", "handled", "migrated", "refactored", "tested", "documented",
  "deployed", "configured", "coordinated", "planned", "analyzed", "analysed",
  "supported", "reviewed", "shipped", "upgraded", "introduced", "adopted",
  "enabled", "ensured", "provided", "partnered", "estimated", "tracked",
  "reported", "presented", "defined", "owned", "drove", "wrote",
  // Italian closed-class function words (articles, prepositions, conjunctions,
  // pronouns, auxiliaries) — capitalized at bullet/sentence starts by orthography
  "il", "lo", "la", "gli", "le", "un", "uno", "una",
  "del", "dello", "della", "dei", "degli", "delle",
  "al", "allo", "alla", "agli", "alle", "dal", "dallo", "dalla", "dagli", "dalle",
  "nel", "nello", "nella", "negli", "nelle", "sul", "sullo", "sulla", "sugli", "sulle",
  "col", "coi", "sui",
  "di", "da", "in", "con", "su", "per", "tra", "fra",
  "presso", "verso", "senza", "sotto", "sopra", "durante", "dopo", "prima",
  "contro", "secondo", "tramite", "mediante", "attraverso", "insieme", "circa", "oltre",
  "ed", "od", "ma", "se", "perché", "che", "come", "quando", "dove", "mentre",
  "però", "quindi", "invece", "cioè", "ossia", "oppure",
  "mi", "ti", "si", "vi", "loro", "questo", "questa", "questi", "queste",
  "quello", "quella", "quelli", "quelle", "altro", "altra", "altri", "altre",
  "tutto", "tutta", "tutti", "tutte", "ogni", "alcuni", "alcune",
  "non", "più", "meno", "molto", "molti", "molta", "molte", "poco", "pochi",
  "ho", "hai", "abbiamo", "avete", "hanno", "sono", "siamo", "era",
  "stato", "stata", "stati", "state", "essere", "avere",
  // Latin abbreviations picked up by the token pattern
  "etc", "e.g", "i.e", "eg", "ie", "well",
  // Common nouns
  "performance", "solution", "solutions", "process", "processes",
  "platform", "infrastructure", "architecture", "framework", "pipeline",
  "deployment", "integration", "development", "production", "environment",
  "database", "frontend", "backend", "microservices", "monolith",
  "scalable", "reliable", "robust", "high", "low", "end",
  // Italian deverbal nouns common in CVs (mirror of the English nouns above)
  "sviluppo", "gestione", "progettazione", "realizzazione", "integrazione",
  "manutenzione", "validazione", "ottimizzazione", "collaborazione",
  "analisi", "supporto", "migrazione", "implementazione", "configurazione",
  "documentazione", "formazione", "supervisione", "coordinamento",
  "pianificazione", "progettazione", "creazione", "pubblicazione",
]);

/** Token pattern: alphanumeric words (Unicode) with internal tech chars (Node.js, CI/CD, C++) */
const TOKEN_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}.+#/-]*/gu;

/**
 * Entity-shape signals that survive sentence-initial position:
 * a word carries one of these even when it starts a bullet/sentence.
 */
function hasEntityMorphology(token: string): boolean {
  // CamelCase: internal capital after a lowercase letter or digit (JavaScript, OAuth2)
  if (/[a-z0-9][A-Z]/.test(token)) return true;
  // Internal tech punctuation with alphanumeric on both sides (Node.js, ASP.NET).
  // Hyphens/slashes are deliberately excluded: ordinary compounds
  // ("Well-designed", "Cross-functional") use them too.
  if (/[\p{L}\p{N}][.+#][\p{L}\p{N}]/u.test(token)) return true;
  // Letter(s) followed by tech symbols (C++, C#, A+)
  if (/^[\p{Lu}]+[.+#/-]+$/u.test(token)) return true;
  // Compound acronym: uppercase segments joined by hyphen/slash (CI/CD, CI-CD)
  if (/^[\p{Lu}]{2,}(?:[-\/][\p{Lu}]{2,})+$/u.test(token)) return true;
  // Acronym: only uppercase letters, length >= 2 (API, AWS, REST)
  if (/^[\p{Lu}]{2,}$/u.test(token)) return true;
  // Letter-starting token containing a digit (GPT-4, OAuth2, S3)
  if (/^[\p{L}]/u.test(token) && /[\p{N}]/u.test(token)) return true;
  return false;
}

/**
 * Verb-shape morphology for sentence-initial words (review fix 2026-10-12):
 * CV bullets conventionally start with action verbs, whose capitalization is
 * orthographic. A sentence-initial word is suppressed only when it is common
 * or verb-shaped — everything else (Kubernetes, Docker, Hibernate, Firestore,
 * Teradata) stays a candidate even in first position.
 *
 * Italian participles are covered by an explicit lexicon (review r3): generic
 * -to/-ta/-ti/-te suffixes would also swallow real technologies ("Hibernate",
 * "Teradata"), because their shapes are morphologically identical.
 */
const ITALIAN_REGULAR_VERB_STEMS = [
  "progett", "realizz", "implement", "svilupp", "creat", "collabor",
  "analizz", "test", "document", "migr", "integr", "valid", "ottimizz",
  "configur", "pubblic", "coordin", "pianific", "support", "miglior",
  "automatizz", "avvi", "form", "adott", "cur", "organizz", "supervision",
  "standardizz", "monitor", "amministr", "install", "utilizz", "present",
];

/** Frequent irregular participles (masculine singular); other forms generated. */
const ITALIAN_IRREGULAR_PARTICIPLES = [
  "gestito", "costruito", "contribuito", "maintenuto", "ottenuto", "scritto",
  "fatto", "risolto", "ridotto", "condotto", "introdotto", "proposto",
  "promosso", "svolto", "seguito", "finito", "definito", "acquisito",
  "tradotto", "prodotto", "eseguito", "assunto", "stabilito", "preso",
  "rimosso", "redatto",
];

/** Generates the four gender/number forms of a masculine-singular participle. */
function expandParticiple(base: string): string[] {
  const stem = base.slice(0, -1);
  return [base, `${stem}a`, `${stem}i`, `${stem}e`];
}

const ITALIAN_VERB_FORMS = new Set<string>([
  ...ITALIAN_REGULAR_VERB_STEMS.flatMap((stem) => [
    `${stem}are`, `${stem}ato`, `${stem}ata`, `${stem}ati`, `${stem}ate`,
  ]),
  ...ITALIAN_IRREGULAR_PARTICIPLES.flatMap(expandParticiple),
]);

function isVerbLikeSegment(segment: string): boolean {
  if (COMMON_WORDS.has(segment)) return true;
  // Explicit Italian verb lexicon (participles incl. gender/number forms)
  if (ITALIAN_VERB_FORMS.has(segment)) return true;
  // English regular past participle / gerund (Integrated, Handled, Managing)
  if (segment.length >= 5 && segment.endsWith("ed")) return true;
  if (segment.length >= 6 && segment.endsWith("ing")) return true;
  // Italian infinitive endings with thematic vowels (Sviluppare, Gestire,
  // Prevedere) plus -rre/-rsi families. Deliberately NOT bare "-re"/"-to":
  // "Firestore" (-ore) and "Hibernate"/"Teradata" (-te/-ta) are technologies
  // whose shapes collide with Italian morphology (review r3).
  if (segment.length >= 6 && (segment.endsWith("are") || segment.endsWith("ere") || segment.endsWith("ire"))) return true;
  if (segment.length >= 6 && (segment.endsWith("rre") || segment.endsWith("rsi"))) return true;
  // Italian gerund (Sviluppando, Utilizzando)
  if (segment.length >= 7 && segment.endsWith("ndo")) return true;
  return false;
}

/**
 * Hyphen/slash compounds ("Well-designed", "Docker-based") are verb-like only
 * when EVERY segment is common or verb-like, so "Docker-based" stays a
 * candidate while "Well-designed" is suppressed.
 */
function isVerbLikeAtSentenceStart(token: string): boolean {
  return token.toLowerCase().split(/[-/]/).every((segment) => isVerbLikeSegment(segment));
}

/**
 * Extracts candidate entity names from text.
 *
 * Capitalization is only a strong entity signal when it is NOT forced by
 * position: the first word of a bullet or sentence is capitalized by
 * orthography in every CV language (verbs in "• Built …", prepositions in
 * "• Presso …"). Sentence-initial words are therefore suppressed only when
 * they are common or verb-shaped; a sentence-initial technology name with no
 * verb shape (Kubernetes, Docker) remains a candidate. Mid-sentence
 * capitalized words remain candidates unconditionally.
 */
function extractCandidateEntities(text: string): string[] {
  const entities: string[] = [];
  // Bullets/lines and sentence boundaries reset orthographic capitalization.
  const segments = text.split(/\n+|(?<=[.!?;])\s+/u);
  for (const segment of segments) {
    const matches = [...segment.matchAll(TOKEN_PATTERN)];
    matches.forEach((match, idx) => {
      // Strip sentence-ending dots ("Sviluppo." → "Sviluppo"); keep tech symbols.
      const token = match[0].replace(/\.+$/u, "");
      if (token.length < 2) return;
      if (COMMON_WORDS.has(token.toLowerCase())) return;
      const shaped = hasEntityMorphology(token);
      if (idx === 0 && !shaped && isVerbLikeAtSentenceStart(token)) return;
      if (!/^[\p{Lu}]/u.test(token) && !shaped) return;
      entities.push(token);
    });
  }
  return [...new Set(entities)];
}

/** Lowercase word tokens of a text, split on any non-alphanumeric character. */
function tokenizeLower(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0);
}

/**
 * Canonical tech form for tolerant word comparison ("node.js" → "nodejs").
 * Only SOFT separators (dot, hyphen, underscore, slash) are removed: they are
 * typographic and "Node.js"/"NodeJS" are the same technology. '+' and '#' are
 * identity-bearing and stay: "C", "C++" and "C#" are distinct technologies
 * and must never normalize to the same form (review r3).
 */
function stripTechChars(token: string): string {
  return token.replace(/[.\-_/]/g, "");
}

/**
 * Builds the known-word sets used to ground rewrites (review fix 2026-10-12).
 *
 * Two passes over the same corpus:
 * - plain word tokens ("bacheca", "studio") for case-insensitive matching;
 * - separator-preserving tokens stripped afterwards, so "Node.js" yields
 *   "nodejs" and matches variants written without separators ("NodeJS",
 *   "Nodejs") that plain tokenization (which splits on "." → "node", "js")
 *   could never reach.
 */
function buildKnownWordSets(corpus: string): { known: Set<string>; knownStripped: Set<string> } {
  const known = new Set<string>();
  const knownStripped = new Set<string>();
  for (const token of tokenizeLower(corpus)) {
    known.add(token);
    const stripped = stripTechChars(token);
    if (stripped.length >= 2) knownStripped.add(stripped);
  }
  for (const match of corpus.toLowerCase().matchAll(TOKEN_PATTERN)) {
    const stripped = stripTechChars(match[0]);
    if (stripped.length >= 2) knownStripped.add(stripped);
  }
  return { known, knownStripped };
}

/**
 * Collects all user-authored text of the CV (excluding personal info, which is
 * privacy-sensitive and never grounds technology entities) so that any word the
 * user already wrote — in any casing, in any section, including component words
 * of multi-word entities like the company "Studio Interfacce Demo" — is known
 * grounding for rewrites.
 */
function cvTextCorpus(cv: CVState): string {
  const parts: string[] = [cv.summary];
  parts.push(...cv.skills);
  for (const e of cv.experience) {
    parts.push(e.company, e.role, e.location ?? "", e.description, e.tldr ?? "");
  }
  for (const c of cv.certifications) {
    parts.push(c.title, c.issuer);
  }
  for (const p of cv.projects) {
    parts.push(p.name, p.role, p.link, p.description, p.tldr ?? "");
  }
  for (const ed of cv.education) {
    parts.push(ed.degree, ed.institution, ed.location);
  }
  for (const l of cv.languages) {
    parts.push(l.language, l.proficiency);
  }
  if (cv.customSection) {
    parts.push(cv.customSection.title, cv.customSection.content);
  }
  return parts.join(" ");
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

/** Any array item that carries an optional location string. */
interface ItemWithLocation {
  location?: string | null;
}

/**
 * Normalizes identity parts into a comparison key. Returns "" when any part is
 * missing/blank: an incomplete identity is unreliable and must not associate
 * two entries (explicit no-assignment rule for ambiguous cases).
 */
function normalizedIdentityKey(parts: Array<string | null | undefined>): string {
  const normalized = parts.map((part) => (part ?? "").trim().toLowerCase().replace(/\s+/g, " "));
  return normalized.every((part) => part.length > 0) ? normalized.join(" | ") : "";
}

/** A patch item's resolved CV counterpart (null = unassociable/new entry). */
interface EntryAssociation<T> {
  counterpart: T | null;
  /** Index of the counterpart inside the CV array (null when unassociated). */
  cvIndex: number | null;
}

/**
 * Identity key layers, most specific first, for associating patch items with
 * CV items. ONLY stable, non-protected fields take part (review r4): a
 * proposed startDate/year is alterable by the model and must never serve as
 * sufficient identity proof — it is at most corroborating evidence when
 * resolving duplicates. Date-free layers also survive date tampering.
 */
const EXPERIENCE_KEY_LAYERS: Array<(e: ExperienceEntry) => string> = [
  (e) => normalizedIdentityKey([e.company, e.role]),
  (e) => normalizedIdentityKey([e.company]),
];

const EDUCATION_KEY_LAYERS: Array<(e: Education) => string> = [
  (e) => normalizedIdentityKey([e.institution, e.degree]),
  (e) => normalizedIdentityKey([e.institution]),
];

/** Protected values used as corroborating (never sufficient) evidence. */
const EXPERIENCE_PROTECTED_VALUES = (e: ExperienceEntry): string[] => [e.startDate, e.endDate ?? ""];
const EDUCATION_PROTECTED_VALUES = (e: Education): string[] => [e.year];

/** Result of associating one section's patch items with its CV items. */
interface SectionAssociation<T> {
  associations: Array<EntryAssociation<T>>;
  /**
   * True when at least one item's identity is ambiguous AND a wrong
   * assignment could corrupt protected facts: the section must NOT be applied.
   */
  unsafe: boolean;
}

/**
 * Associates each patch item with its CV counterpart (review r3/r4) — ONE-TO-ONE.
 * The mapping is shared by the location restore (Check 0) and the date/year
 * protection (Check 1) so every protected field of an entry is restored from
 * the SAME CV entry.
 *
 * Procedure:
 * 1. Candidates come from stable identity layers only (no patch dates).
 * 2. One candidate → associate. Several candidates (duplicate identities):
 *    - date agreement AND index agreement on the same candidate → associate
 *      (strongest corroboration);
 *    - index agreement only (dates match no candidate) → associate the
 *      same-index entry — the date protection then blocks any alteration;
 *    - date-only agreement, or date vs index conflict → AMBIGUOUS: an
 *      alterable proposed date is never sufficient proof of identity.
 * 3. One-to-one enforcement: when several items claim the same CV entry, the
 *    higher-evidence claim wins; losers re-evaluate on the remaining
 *    candidates (none left → treated as a new entry, inheriting nothing).
 * 4. Ambiguous items are safe only when every candidate carries identical
 *    protected values that the patch also matches (restores would be no-ops).
 *    Otherwise the section is flagged unsafe and must be held for review.
 */
function associateEntries<T extends ItemWithLocation>(
  patchItems: T[] | undefined,
  cvItems: T[],
  keyLayers: Array<(item: T) => string>,
  protectedValuesOf: (item: T) => string[],
  section: string,
): SectionAssociation<T> {
  if (!patchItems) return { associations: [], unsafe: false };

  // Phase 1: candidates via stable identity layers (no patch dates involved).
  const candidatesFor: Array<Array<{ item: T; idx: number }>> = patchItems.map((item) => {
    for (const layer of keyLayers) {
      const key = layer(item);
      if (!key) continue;
      const matches = cvItems
        .map((cvItem, idx) => ({ item: cvItem, idx }))
        .filter((m) => layer(m.item) === key);
      if (matches.length > 0) return matches;
    }
    return [];
  });

  // Phase 2: tentative per-item assignment with evidence tiers.
  // tier 3 = date+index agreement, 2 = index only, 1 = unique identity match.
  const ambiguousIdx = new Set<number>();
  interface Tentative { cvIdx: number | null; tier: number }
  const tentative: Tentative[] = patchItems.map((item, i): Tentative => {
    const cands = candidatesFor[i];
    if (cands.length === 0) return { cvIdx: null, tier: 0 };
    if (cands.length === 1) return { cvIdx: cands[0].idx, tier: 1 };

    const values = protectedValuesOf(item);
    const valuesOf = (c: { item: T }): boolean =>
      protectedValuesOf(c.item).every((v, k) => v === values[k]);
    const byDate = cands.filter(valuesOf);
    const byIndex = cands.filter((c) => c.idx === i);
    const both = byDate.filter((c) => byIndex.some((x) => x.idx === c.idx));

    if (both.length === 1) return { cvIdx: both[0].idx, tier: 3 };
    if (byIndex.length === 1 && byDate.length === 0) return { cvIdx: byIndex[0].idx, tier: 2 };
    // Date-only agreement, date-vs-index conflict, or no signal at all:
    ambiguousIdx.add(i);
    return { cvIdx: null, tier: 0 };
  });

  // Phase 3: one-to-one enforcement. Higher tier claims first; a loser
  // re-evaluates on unclaimed candidates and may itself become ambiguous.
  const claimed = new Set<number>();
  const associations: Array<EntryAssociation<T>> = patchItems.map(() => ({ counterpart: null, cvIndex: null }));
  const claimOrder = tentative
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.cvIdx !== null)
    .sort((a, b) => b.t.tier - a.t.tier || a.i - b.i);
  for (const { t, i } of claimOrder) {
    const cvIdx = t.cvIdx!;
    if (!claimed.has(cvIdx)) {
      claimed.add(cvIdx);
      associations[i] = { counterpart: cvItems[cvIdx], cvIndex: cvIdx };
      continue;
    }
    const remaining = candidatesFor[i].filter((c) => !claimed.has(c.idx));
    if (remaining.length === 1) {
      claimed.add(remaining[0].idx);
      associations[i] = { counterpart: remaining[0].item, cvIndex: remaining[0].idx };
    } else if (remaining.length > 1) {
      console.warn(`[AI Grounding] Ambiguous ${section}[${i}]: multiple candidates after one-to-one resolution.`);
      ambiguousIdx.add(i);
    }
    // remaining.length === 0 → genuinely new (or unprovable) entry: no
    // counterpart, so it inherits no dates and no location (review r4).
  }

  // Phase 4: safety check. Duplicate-identity items are safe only when no
  // wrong assignment could change what gets applied (review r4/r5):
  // - untrusted/ambiguous items need uniform protected dates that the patch
  //   also matches (every date restore would be a no-op);
  // - when the dates cannot distinguish the candidates at all (the patch's
  //   dates match SEVERAL candidates), an index-based pick would GUESS which
  //   location to restore: if the candidates' locations differ and the patch
  //   blanked its location, the section is unsafe — no guessing by index.
  let unsafe = false;
  for (let i = 0; i < patchItems.length; i++) {
    const cands = candidatesFor[i];
    if (cands.length < 2) continue;

    const values = protectedValuesOf(patchItems[i]);
    const valuesOf = (c: { item: T }): boolean =>
      protectedValuesOf(c.item).every((v, k) => v === values[k]);
    const byDate = cands.filter(valuesOf);

    if (byDate.length > 1) {
      // Dates match multiple candidates: identity is indistinguishable by
      // any protected signal. A pending location restore would be a guess.
      const patchLocation = patchItems[i].location;
      const patchLocationBlank = !(patchLocation && patchLocation.trim().length > 0);
      const candidateLocations = cands.map((c) => (c.item.location ?? "").trim());
      const allIdentical = candidateLocations.every((l) => l === candidateLocations[0]);
      const anyNonEmpty = candidateLocations.some((l) => l.length > 0);
      if (patchLocationBlank && anyNonEmpty && !allIdentical) {
        console.warn(`[AI Grounding] Unsafe ambiguity in ${section}[${i}]: candidates share identity and dates but differ in location — not guessing by index.`);
        unsafe = true;
      }
      continue;
    }

    if (ambiguousIdx.has(i)) {
      const firstValues = protectedValuesOf(cands[0].item).join("\u0000");
      const uniform = cands.every((c) => protectedValuesOf(c.item).join("\u0000") === firstValues);
      const patchMatches = uniform && values.join("\u0000") === firstValues;
      if (!patchMatches) {
        console.warn(`[AI Grounding] Unsafe ambiguity in ${section}[${i}]: protected values cannot be matched reliably.`);
        unsafe = true;
      }
    }
  }

  return { associations, unsafe };
}

/**
 * Restores non-empty CV locations for patch items whose location was blanked
 * or omitted, using the shared association. Never assigns a location from an
 * entry the item was not associated with.
 */
function restoreBlankedItemLocations<T extends ItemWithLocation>(
  patchItems: T[],
  associations: Array<EntryAssociation<T>>,
  section: string,
): T[] {
  return patchItems.map((item, i) => {
    if (item.location && item.location.trim().length > 0) return item;

    const source = associations[i]?.counterpart;
    if (!source) return item;

    const current = source.location;
    if (current && current.trim().length > 0) {
      console.warn(`[AI Grounding] Rejected destructive change: ${section}[${i}].location would be blanked.`);
      return { ...item, location: current };
    }
    return item;
  });
}
/** Shared association record for the two reorder-prone sections. */
interface PatchAssociations {
  experience: Array<EntryAssociation<ExperienceEntry>>;
  education: Array<EntryAssociation<Education>>;
}

function removeDestructiveChanges(cleanPatch: CVPatch, cv: CVState, associations: PatchAssociations): void {
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

  // Item-level location protection (experience[i].location, education[i].location).
  // The quick-reference snapshot omits per-item locations, so rewrites of these
  // sections (e.g. full-CV translation) come back with empty or missing
  // locations; applyAiPatch replaces the arrays wholesale, which would silently
  // drop the user's data. Restore the non-empty current value instead, using
  // the shared identity-based association (never array index — the model may
  // reorder entries; review fix 2026-10-12 + r3).
  if (cleanPatch.experience) {
    cleanPatch.experience = restoreBlankedItemLocations(
      cleanPatch.experience,
      associations.experience,
      "experience",
    );
  }
  if (cleanPatch.education) {
    cleanPatch.education = restoreBlankedItemLocations(
      cleanPatch.education,
      associations.education,
      "education",
    );
  }
}

/**
 * Validates a proposed CV patch against the original CV.
 * Returns a clean patch (with protected date/year changes restored) and a grounding report.
 */
export function validatePatch(patch: CVPatch, cv: CVState): ValidatePatchResult {
  const facts = extractVerifiedFacts(cv);
  const vocab = buildVocabulary(cv);

  const flaggedInventions: FlaggedInvention[] = [];
  const needsVerification: NeedsVerification[] = [];
  const rejectedVerifiedEdits: RejectedVerifiedEdit[] = [];
  const styleWarnings: StyleWarning[] = [];

  const cleanPatch: CVPatch = { ...patch };

  // ─── Entry association (review r3/r4) ────────────────────────────
  // One identity-based ONE-TO-ONE patch→CV mapping per section, shared by
  // Check 0 (location restore) and Check 1 (date/year protection) so every
  // protected field of an entry is restored from the SAME CV entry. A section
  // whose association is ambiguous AND corruption-prone is dropped from the
  // patch entirely and surfaced as an explicit review flag: never apply a
  // section that could corrupt protected facts.
  const experienceAssociation = associateEntries(
    cleanPatch.experience, cv.experience,
    EXPERIENCE_KEY_LAYERS, EXPERIENCE_PROTECTED_VALUES, "experience",
  );
  const educationAssociation = associateEntries(
    cleanPatch.education, cv.education,
    EDUCATION_KEY_LAYERS, EDUCATION_PROTECTED_VALUES, "education",
  );

  const associations: PatchAssociations = {
    experience: experienceAssociation.associations,
    education: educationAssociation.associations,
  };

  if (experienceAssociation.unsafe) {
    console.warn("[AI Grounding] Discarding experience: ambiguous entry association could corrupt protected facts.");
    delete cleanPatch.experience;
    associations.experience = [];
    flaggedInventions.push({
      term: "experience",
      category: "association",
      message: 'Changes to "experience" were discarded because the entries could not be safely matched to your CV (ambiguous association). Try again with a more specific request, for example one entry at a time.',
    });
  }
  if (educationAssociation.unsafe) {
    console.warn("[AI Grounding] Discarding education: ambiguous entry association could corrupt protected facts.");
    delete cleanPatch.education;
    associations.education = [];
    flaggedInventions.push({
      term: "education",
      category: "association",
      message: 'Changes to "education" were discarded because the entries could not be safely matched to your CV (ambiguous association). Try again with a more specific request, for example one entry at a time.',
    });
  }

  // ─── Check 0: Destructive change prevention ─────────────────────
  // Runs FIRST. Silently strips fields where the LLM replaced non-empty
  // content with empty/null/blank. This is almost never what the user wants
  // and is usually a side-effect of the LLM "filling in" fields it couldn't
  // read from the snapshot. Logged server-side; not surfaced to the UI to
  // avoid confusing the user with changes they never asked for.
  removeDestructiveChanges(cleanPatch, cv, associations);

  // ─── Check 1: Existing date/year protection ─────────────────────────
  checkVerifiedFacts(cleanPatch, cv, facts, rejectedVerifiedEdits, associations);

  // ─── Check 2: Anti-Invention ────────────────────────────────────
  checkInventions(cleanPatch, cv, vocab, flaggedInventions);

  // ─── Check 3: Needs-Verification metrics ────────────────────────
  checkUnverifiedMetrics(cleanPatch, cv, facts, needsVerification);

  // ─── Check 4: Selected passive-opener warnings ────────────────────────────────────
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
  rejected: RejectedVerifiedEdit[],
  associations: PatchAssociations
): void {
  // Check education years — counterpart from the shared association, NOT the
  // array index: the model may reorder entries and an index-based restore
  // would assign another entry's year (review r3).
  if (patch.education) {
    patch.education = patch.education.map((edu, i) => {
      const assoc = associations.education[i];
      const originalEdu = assoc?.counterpart ?? null;
      const cvIdx = assoc?.cvIndex ?? null;
      if (!originalEdu || cvIdx === null) return edu;

      const yearFact = facts.find((f) => f.sourcePath === `education[${cvIdx}].year`);
      if (yearFact && edu.year !== originalEdu.year) {
        rejected.push({
          fact: yearFact,
          proposed: edu.year,
          message: `Education year "${originalEdu.year}" is a protected existing CV value — AI change to "${edu.year}" was blocked.`,
        });
        return { ...edu, year: originalEdu.year };
      }
      return edu;
    });
  }

  // Check experience dates — same association-based counterpart.
  if (patch.experience) {
    patch.experience = patch.experience.map((exp, i) => {
      const assoc = associations.experience[i];
      const originalExp = assoc?.counterpart ?? null;
      const cvIdx = assoc?.cvIndex ?? null;
      if (!originalExp || cvIdx === null) return exp;

      const startFact = facts.find((f) => f.sourcePath === `experience[${cvIdx}].startDate`);
      const endFact = facts.find((f) => f.sourcePath === `experience[${cvIdx}].endDate`);

      let fixed = exp;
      if (startFact && exp.startDate !== originalExp.startDate) {
        rejected.push({
          fact: startFact,
          proposed: exp.startDate,
          message: `Start date "${originalExp.startDate}" is a protected existing CV value — AI change to "${exp.startDate}" was blocked.`,
        });
        fixed = { ...fixed, startDate: originalExp.startDate };
      }
      if (endFact && exp.endDate !== originalExp.endDate) {
        rejected.push({
          fact: endFact,
          proposed: exp.endDate ?? "",
          message: `End date "${originalExp.endDate}" is a protected existing CV value — AI change to "${exp.endDate}" was blocked.`,
        });
        fixed = { ...fixed, endDate: originalExp.endDate };
      }
      return fixed;
    });
  }

  // Check certification years. Still index-based: certifications carry no
  // reorder-prone protected fields beyond the year and no identity layer is
  // defined for them yet (documented residual, review r3 scope).
  if (patch.certifications) {
    patch.certifications = patch.certifications.map((cert, i) => {
      const originalCert = cv.certifications[i];
      if (!originalCert) return cert;

      const yearFact = facts.find((f) => f.sourcePath === `certifications[${i}].year`);
      if (yearFact && cert.year !== originalCert.year) {
        rejected.push({
          fact: yearFact,
          proposed: cert.year ?? "",
          message: `Certification year "${originalCert.year}" is a protected existing CV value — AI change to "${cert.year}" was blocked.`,
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

  // Known-word grounding from the user's whole CV (case-insensitive):
  // any word the user already wrote — including component words of multi-word
  // entities ("Studio" from company "Studio Interfacce Demo"), words whose
  // casing changed in the rewrite ("bacheca" → "Bacheca") and separator
  // variants of tech names ("Node.js" ↔ "NodeJS") — is not an invention.
  // The corpus includes every text field, so it is a superset of each
  // field's original text and grounds cross-section reuse as well.
  const { known: cvKnown, knownStripped: cvKnownStripped } = buildKnownWordSets(cvTextCorpus(cv));

  for (const { proposed } of textFields) {
    for (const entity of extractCandidateEntities(proposed)) {
      const lower = entity.toLowerCase();
      if (cvKnown.has(lower)) continue;
      const stripped = stripTechChars(lower);
      if (stripped.length >= 2 && cvKnownStripped.has(stripped)) continue;
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
