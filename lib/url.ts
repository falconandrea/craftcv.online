/**
 * Shared URL and contact normalization boundary.
 *
 * Single source of truth for how CraftCV stores, imports and displays URLs:
 * - stored/imported destinations are absolute (https:// added when missing)
 * - visible labels keep the full host/path but drop protocol noise and "www."
 *
 * Used by manual editor input, PDF import, JSON import, PDF contact rendering
 * and project link rendering so destinations and labels never diverge.
 */

import type { PersonalInfo } from "@/state/types";

/** Any URI scheme, e.g. "https:", "http:", "mailto:" */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/** A plausible http destination without a scheme: "host.tld" + optional path/query */
const BARE_DOMAIN_RE = /^[\w-]+(?:\.[\w-]+)+(?:[/?#][^\s]*)?$/;

/**
 * Readable link label: full host/path without protocol or leading "www.".
 * Empty/whitespace input yields "". Never throws — malformed input is
 * returned trimmed with at most the protocol/www. prefix removed.
 */
export function displayUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}

/**
 * Strict HTTP(S) validation via the URL parser: the URL must be parseable,
 * use the http/https protocol and carry a non-empty hostname. This rejects
 * values like "http://", "https://example.com:bad" or non-web schemes.
 */
function parseHttpUrl(candidate: string): URL | null {
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Absolute clickable destination for PDF links — http(s) only.
 *
 * - well-formed http:// and https:// values are kept as-is
 * - scheme-less domain-like values receive a safe "https://" prefix
 *   (only when the result parses as a valid HTTP URL)
 * - any other scheme (mailto:, javascript:, data:, …) or invalid input
 *   yields null: the value stays editable and displayable as plain text,
 *   but is never rendered as a clickable PDF link
 */
export function absoluteUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (SCHEME_RE.test(trimmed)) {
    return parseHttpUrl(trimmed) ? trimmed : null;
  }
  if (BARE_DOMAIN_RE.test(trimmed)) {
    return parseHttpUrl(`https://${trimmed}`) ? `https://${trimmed}` : null;
  }
  return null;
}

/**
 * Editing-boundary normalization: make the stored value an absolute http(s)
 * destination when it is domain-like, but leave free text and unsupported
 * schemes (e.g. "mailto:") untouched so nothing changes unexpectedly while
 * the user is editing — rendering decides clickability, not the editor.
 */
export function ensureHttpDestination(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (SCHEME_RE.test(trimmed)) return trimmed;
  if (BARE_DOMAIN_RE.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

/**
 * Import heuristic for links extracted from PDFs (raw text) or older JSON
 * exports. Returns the absolute http(s) destination, or null when the value
 * should be discarded (empty, non-web scheme, root-relative path, or free
 * text — e.g. "mailto:me@example.com" is not a professional web link).
 */
export function normalizeImportedUrl(link: string): string | null {
  const trimmed = link.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return parseHttpUrl(trimmed) ? trimmed : null;
  }
  if (SCHEME_RE.test(trimmed)) return null;
  if (trimmed.startsWith("/in/")) return `https://linkedin.com${trimmed}`;
  if (trimmed.startsWith("/")) return null;

  const username = trimmed.replace(/\/$/, "");
  if (username && !username.includes(".") && !username.includes(" ")) {
    return `https://github.com/${username}`;
  }
  if (!username.includes(" ")) return `https://${username}`;
  return null;
}

/**
 * Contact-shape boundary for imports: guarantees the canonical PersonalInfo
 * shape (phone/timezone default to "") and absolute link destinations.
 * Tolerates missing or partial input without discarding valid data.
 */
export function normalizeImportedPersonalInfo(
  info: Partial<PersonalInfo> | undefined,
): PersonalInfo {
  const personal = info ?? {};
  return {
    fullName: personal.fullName ?? "",
    location: personal.location ?? "",
    email: personal.email ?? "",
    phone: personal.phone ?? "",
    timezone: personal.timezone ?? "",
    links: Array.isArray(personal.links)
      ? personal.links
          .map(normalizeImportedUrl)
          .filter((link): link is string => link !== null)
      : [],
  };
}
