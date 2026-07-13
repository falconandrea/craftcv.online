/**
 * Tech Synonym Map
 *
 * Bidirectional alias map for common technology name variations.
 * Used by skill-evidence linker and vocabulary builder to match
 * semantically identical terms that differ in spelling.
 *
 * The fuzzy matcher in vocabulary.ts handles suffix variants like
 * "React" vs "React.js" — this map covers *semantic* aliases
 * that fuzzy matching cannot resolve (e.g. "JS" ↔ "JavaScript").
 */

/**
 * Canonical alias pairs.
 * Each entry maps [alias, canonical].
 * The resolver normalizes both directions.
 */
const ALIAS_PAIRS: ReadonlyArray<readonly [string, string]> = [
  // JavaScript ecosystem
  ["js", "javascript"],
  ["ts", "typescript"],
  ["node", "node.js"],
  ["react", "reactjs"],
  ["vue", "vuejs"],
  ["next", "nextjs"],
  ["nuxt", "nuxtjs"],
  ["express", "expressjs"],

  // Languages
  ["golang", "go"],
  ["csharp", "c#"],
  ["cpp", "c++"],
  ["py", "python"],
  ["rb", "ruby"],

  // Databases
  ["postgres", "postgresql"],
  ["mongo", "mongodb"],
  ["mysql", "mariadb"],
  ["redis", "redis"],
  ["sqlite", "sqlite3"],

  // Cloud & DevOps
  ["aws", "amazon web services"],
  ["gcp", "google cloud"],
  ["azure", "microsoft azure"],
  ["k8s", "kubernetes"],
  ["tf", "terraform"],

  // AI / ML
  ["ml", "machine learning"],
  ["ai", "artificial intelligence"],
  ["dl", "deep learning"],
  ["nlp", "natural language processing"],
  ["cv", "computer vision"],

  // Misc
  ["ui", "user interface"],
  ["ux", "user experience"],
  ["ci/cd", "continuous integration"],
  ["rest", "restful"],
  ["graphql", "gql"],
];

/**
 * Internal lookup: lowercased term → canonical form.
 * Built once at module load.
 */
const LOOKUP = new Map<string, string>();

for (const [a, b] of ALIAS_PAIRS) {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  // Both directions point to the same canonical (the first entry wins)
  if (!LOOKUP.has(la)) LOOKUP.set(la, la);
  if (!LOOKUP.has(lb)) LOOKUP.set(lb, la);
}

/**
 * Normalizes a term to its canonical synonym form.
 * Returns the lowercased canonical if a synonym exists,
 * otherwise returns the lowercased input unchanged.
 *
 * @example
 * normalize("JavaScript") // "js"
 * normalize("TypeScript")  // "ts"
 * normalize("React")       // "react"
 * normalize("Unknown")     // "unknown"
 */
export function normalize(term: string): string {
  const lower = term.trim().toLowerCase();
  return LOOKUP.get(lower) ?? lower;
}

/**
 * Checks if two terms are synonyms of each other.
 *
 * @example
 * areSynonyms("JS", "JavaScript") // true
 * areSynonyms("React", "Vue")     // false
 */
export function areSynonyms(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/**
 * Returns all known aliases for a term (including itself).
 * Useful for building search patterns.
 */
export function getAliases(term: string): string[] {
  const canonical = normalize(term);
  const aliases: string[] = [canonical];

  for (const [key, value] of LOOKUP.entries()) {
    if (value === canonical && key !== canonical) {
      aliases.push(key);
    }
  }

  return aliases;
}
