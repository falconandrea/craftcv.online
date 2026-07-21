// HTTP content-negotiation helpers for "Markdown for Agents".
// Spec: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
//
// Behavior summary:
//   - Browsers send `Accept: text/html,...`         -> HTML (default)
//   - Agents send `Accept: text/markdown`           -> Markdown
//   - Agents send `Accept: text/markdown, text/html;q=0.5` -> Markdown (preferred)
//   - No Accept header, or `Accept: */*`            -> HTML (default)
//   - Explicit `text/markdown;q=0`                  -> HTML (explicit refusal)

interface AcceptType {
  type: string;
  q: number;
}

/**
 * Parse an HTTP `Accept` header into a list of `{ type, q }` entries.
 * Malformed entries are ignored. q defaults to 1 when not present.
 */
export function parseAcceptHeader(accept: string | null): AcceptType[] {
  if (!accept || accept.trim() === "") return [];

  return accept
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split(";");
      const type = parts[0]?.trim().toLowerCase() ?? "";
      if (!type) return null;

      let q = 1;
      for (const param of parts.slice(1)) {
        const [k, v] = param.trim().split("=");
        if (k.trim() === "q") {
          const parsed = parseFloat(v ?? "");
          if (!Number.isNaN(parsed)) q = parsed;
        }
      }
      return { type, q };
    })
    .filter((t): t is AcceptType => t !== null);
}

/**
 * Decide whether a request wants `text/markdown` in preference to HTML.
 *
 * Returns true only when `text/markdown` is explicitly listed with q > 0 AND
 * either:
 *   - HTML is not requested at all, OR
 *   - Markdown has at least as high a q-value as HTML.
 *
 * This matches Cloudflare's Markdown for Agents behavior: the mere presence of
 * the markdown media type, with a non-zero q-value, wins. Wildcards do NOT
 * trigger markdown — browsers that send a catch-all Accept keep getting HTML.
 */
export function wantsMarkdown(accept: string | null): boolean {
  const types = parseAcceptHeader(accept);

  const md = types.find((t) => t.type === "text/markdown");
  if (!md || md.q <= 0) return false;

  const html = types.find((t) => t.type === "text/html");
  if (!html) return true;

  return md.q >= html.q;
}

/**
 * Rough token-count estimator for the `x-markdown-tokens` response header.
 *
 * Cloudflare's Markdown for Agents emits an estimated token count using a
 * private heuristic; this implementation uses the well-known approximation
 * of ~4 characters per token (closer to ~3.5 for English, but 4 keeps the
 * math stable across languages and code blocks).
 *
 * This is an ESTIMATE, not an exact tokenizer. Good enough for agents to
 * size context windows and chunking strategies, which is the header's purpose.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}
