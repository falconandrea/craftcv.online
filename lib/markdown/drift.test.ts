import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { MARKDOWN_BY_PATH } from "./agent-content";

// Drift detection between rendered HTML pages and their markdown representation.
//
// The markdown bodies in `agent-content.ts` are authored by hand to mirror what
// the corresponding `app/<route>/page.tsx` renders. Without a check, the two
// silently drift when someone edits the page and forgets to update the
// markdown (or vice versa) — agents would then see stale content.
//
// Strategy: for each route, assert a set of "invariant" strings appear in BOTH
// the page.tsx source and the markdown body. Invariants are durable,
// content-bearing fragments (H1/H2 text, contact info, brand names, key copy)
// that exist as single contiguous text nodes in the JSX, so a plain substring
// search on the source file is reliable.
//
// When this test fails:
//   - "HTML contains X" failure   -> the page was edited; update the markdown.
//   - "Markdown contains X" failure -> the markdown was edited; update the page
//                                     (or pick a more durable invariant).

interface RouteContract {
  // Path to the page.tsx source, relative to the project root.
  pageSource: string;
  // Strings that MUST appear verbatim in both sources. Pick fragments that
  // are stable across restyling: section headings, contact info, brand names,
  // distinctive copy. Avoid styling-adjacent text (button labels that might
  // get renamed, etc.) unless they are load-bearing for the page's meaning.
  invariants: string[];
}

const ROUTES: Record<string, RouteContract> = {
  "/": {
    pageSource: "app/page.tsx",
    invariants: [
      "ATS Score + Keyword Gap",
      "Privacy First",
      "PDF Import",
      "Chat-based suggestions with context",
      "Privacy by design — PII masked before AI",
      "One-click apply or skip each change",
      "Built for professionals who value privacy and results.",
      "https://github.com/falconandrea/craftcv.online",
    ],
  },
  "/privacy": {
    pageSource: "app/privacy/page.tsx",
    invariants: [
      "Privacy-First",
      "falcon.andrea88@gmail.com",
      "Google Analytics 4 (GA4) / GTM",
      "Microsoft Clarity",
      "CookieYes",
    ],
  },
  "/cookies": {
    pageSource: "app/cookies/page.tsx",
    invariants: [
      "cv-storage",
      "theme-storage",
      "Google Tag Manager",
      "Google Analytics 4 (GA4)",
      "Microsoft Clarity",
      "CookieYes",
    ],
  },
  "/ats-score": {
    pageSource: "app/ats-score/page.tsx",
    invariants: [
      "Applicant Tracking System",
      "Workday, Taleo",
      "missing keywords",
    ],
  },
};

// Every route that ships a markdown body MUST have a drift contract here.
// This guard catches the case where someone adds a new entry to
// MARKDOWN_BY_PATH but forgets to add invariants (which would silently skip
// drift detection for that route).
describe("markdown drift contracts", () => {
  it("every route in MARKDOWN_BY_PATH has a drift contract", () => {
    const routesWithMarkdown = Object.keys(MARKDOWN_BY_PATH).sort();
    const routesWithContract = Object.keys(ROUTES).sort();
    expect(routesWithContract).toEqual(routesWithMarkdown);
  });
});

for (const [routePath, contract] of Object.entries(ROUTES)) {
  const markdownBody = MARKDOWN_BY_PATH[routePath]?.body ?? "";
  const pageSource = readFileSync(
    resolve(process.cwd(), contract.pageSource),
    "utf8",
  );

  describe(`drift: ${routePath} (${contract.pageSource})`, () => {
    for (const invariant of contract.invariants) {
      it(`HTML source contains "${invariant}"`, () => {
        // If this fails, the page was edited and the invariant no longer
        // appears. Either update the markdown to match the new copy, or
        // update the invariant to a more durable fragment.
        expect(pageSource).toContain(invariant);
      });

      it(`Markdown body contains "${invariant}"`, () => {
        // If this fails, the markdown drifted out of sync with the page.
        // Update agent-content.ts so the markdown matches the rendered HTML.
        expect(markdownBody).toContain(invariant);
      });
    }
  });
}
