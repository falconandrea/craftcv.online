# CraftCV — SEO Strategy Plan

> Last updated: 2026-08-02
> Status: Technical fixes revised on `fix/seo-improvements`. Content/distribution
> phase is **opinion-based until backed by real data** (see Phase 0). Do not
> treat keyword/page targets as decisions until Phase 0 produces evidence.

## Guiding principle

Ranking is the product of **crawlability + intent match + quality + authority +
links**. This plan addresses all five, but the leverage is different at each
stage: technical fixes make the site *eligible* to rank; content + E-E-A-T +
distribution make it *deserve* to rank. Skip the data-gathering phase and you'll
optimise guesses.

## Current situation — hypotheses to verify, not facts

These observations were recorded on **2026-08-01**, from **Italy**, **English
UI**, **incognito Google SERP**. They need an evidence pass before driving
decisions:

- CraftCV appears to have little indexable content (the site is essentially a
  single-page app). **Verify:** run it through Google Search Console and confirm
  indexed page count + word count per URL.
- For the query `CraftCV` the SERP surfaces competitors (craft-cv.com,
  kraftcv.com, visualcv.com). **Verify:** is this branded-query competition or a
  site not being crawled/indexed? Check GSC "URL inspection".
- Competitive moat hypothesis: **open-source + privacy-first + deterministic ATS
  rules**. **Verify:** build a real comparison table (feature × competitor) before
  claiming "no competitor has all three".

These three checks are Phase 0. Everything below assumes Phase 0 confirms the
direction; if it doesn't, revisit before building content.

## What's fixed on this branch (`fix/seo-improvements`)

| # | Fix | File | Notes |
|---|-----|------|-------|
| 1 | `metadataBase` + per-page canonical (self-referencing) | `app/layout.tsx`, `app/ats-score/layout.tsx`, `app/privacy/page.tsx`, `app/cookies/page.tsx` | Root canonical was `/` and inherited by every route; each indexable page now points to itself. |
| 2 | Open Graph + Twitter Card tags | `app/layout.tsx` | `openGraph.url` overridden per page too. |
| 3 | JSON-LD `SoftwareApplication` | `app/layout.tsx` | Removed invalid `applicationSubCategory`; fixed inaccurate privacy claims; not rich-result-eligible until real ratings exist (see to.md). |
| 4 | `noindex` on `/dashboard` and `/editor` | their layouts | Consistent with `robots.txt` (not disallowed, so the noindex is crawlable). |
| 5 | Sitemap cleaned (removed app pages + `llms.txt`) | `app/sitemap.ts` | `/privacy` and `/cookies` kept; consider dropping them (not strategic). |
| 6 | Security headers + `poweredByHeader: false` + asset cache | `next.config.ts` | |
| 7 | Shared `SITE_URL` (env-overridable) | `lib/site.ts` | Removes duplication between layout + sitemap. |
| 8 | "toany" typo fix | `app/page.tsx` | |
| 9 | Dynamic OG image (1200×630) generated with `next/og` | `app/opengraph-image.tsx` | `force-static` so it is prerendered at build time (the root layout's `force-dynamic` would otherwise propagate and rasterise on every crawler hit). Replaces the never-committed `/og.png`. |
| 10 | `pageOpenGraph()` helper for non-root pages | `lib/site.ts`, `app/ats-score/layout.tsx`, `app/privacy/page.tsx`, `app/cookies/page.tsx` | Next replaces `openGraph` wholesale in child segments, so `/ats-score`, `/privacy` and `/cookies` were emitting **no** `og:image`, `og:site_name` or `og:type` at all. Verified in the served HTML. |

### Intentionally NOT changed (trade-offs)

- **`force-dynamic` kept on the root layout.** Removing it would statically
  prerender pages, but GTM is read from a runtime env (`GTM_ID`) that is not a
  Docker build ARG — static build = no GTM = analytics regression. Keep dynamic
  until GTM is migrated to a build-time `NEXT_PUBLIC_GTM_ID` (see to.md).
- **Static prerender for page routes.** Only `/opengraph-image` and
  `/sitemap.xml` are static; all page routes stay dynamic because of the GTM env
  above. Impact is TTFB and CDN cacheability, not ranking.

---

## Phase 0 — Evidence & baseline (do this first, ~1 week)

Before writing a single line of content, remove guesswork.

- [ ] **Confirm GSC** ownership is verified (progress.md marks it done — confirm
  the property still resolves and data is flowing).
- [ ] **Submit `sitemap.xml`** in GSC; wait for indexing status.
- [ ] **Collect a real baseline** (2-4 weeks): indexed pages, impressions,
  clicks, average position, top queries, CTR. Record numbers, not vibes.
- [ ] **Own your brand SERP**: search `CraftCV` (and `craft cv`, `craft cv
  builder`) incognito from your target market. You should rank #1 for your brand.
  If not, that's the first thing to fix (homepage copy + a few brand backlinks).
- [ ] **Keyword research with a tool** (Ahrefs free / GSC / Keyword Planner /
  manual SERP): for each candidate term capture **volume, difficulty, intent,
  SERP composition**. Replace the candidate keywords below with evidenced ones.
- [ ] **Wire conversion tracking** in GTM/GA4 (`cta_start_build`, `pdf_export`,
  `ats_score_run`, `ai_message_sent`). Traffic without conversion data is vanity.

Only after Phase 0 do Phases 1-4 make sense.

## Phase 1 — Consolidate, then expand (after Phase 0)

The homepage alone won't rank for competitive terms, but **don't spin up four
new pages for four keywords** — that's how cannibalisation starts.

- [ ] **Make `/ats-score` a complete SEO landing/tool page first.** It already
  exists. Do **not** also create `/ats-checker` — pick one canonical URL and point
  everything there (301 the other if it ever existed). One strong page beats two
  competing ones.
- [ ] Only add more routes if the intent is genuinely different **and** you can
  serve it well:
  - `/cv-templates` — **only if multiple real, comparable templates exist.** A
    single-template "templates" page is thin content.
  - `/ai-cv-writer`, `/keyword-match` — defer until keyword research proves
    volume/intent worth a dedicated page.
- [ ] **Word count is not the goal.** The goal is *complete coverage of the
  search intent*. Match what the SERP actually rewards, not an arbitrary
  "500-800 words".

## Phase 2 — Content + E-E-A-T (small, high-quality)

The blog wins long-tail, but for a brand-new domain the **Helpful Content
System** filters generic SEO prose. Quality and demonstrated experience matter
more than volume.

- [ ] **Start with 3-5 pillar articles**, each grounded in *this project's real
  experience* (e.g., "How I built a deterministic ATS lint engine", "What 16 ATS
  rules catch that ChatGPT misses"). Real experience = E-E-A-T signal.
- [ ] **Add a real author/About page**: Andrea's bio, link to GitHub + profile.
  Consider `Person`/`ProfilePage` schema. An anonymous blog on a new domain is
  an E-E-A-T liability.
- [ ] **Internal linking**: every article links to the relevant tool page
  (`/ats-score`) — this is how tool pages earn relevance.
- [ ] **Don't target 20+ articles as a first milestone.** Ship 3-5, measure,
  then decide.

> Note on rich results: Google heavily restricted `FAQPage` and `HowTo` rich
> results (FAQ now mostly limited to gov/health sites; HowTo visibility very
> low). Don't build content chasing these snippets — they're not a priority.

## Phase 3 — Distribution (measure, don't assume)

| Channel | Action | Realistic expectation |
|---------|--------|-----------------------|
| GitHub README | Keyword-rich anchor to live site | Cheap, lasting backlink + referral. **Highest reliable ROI.** |
| Dev.to / Hashnode | Technical write-ups (the ATS engine, determinism) | Lasting backlinks, developer audience. |
| LinkedIn | Andrea's posts | Brand awareness, low SEO weight. |
| Product Hunt | Launch/relaunch | One-time spike; timing + assets matter. |
| HackerNews | "Show HN" | **Hypothesis, not fact** that it's high-ROI. Often sinks; depends on timing/luck. |
| Reddit | r/jobs, r/cscareerquestions, r/resumes | Self-promotion rules are strict — be a real participant first or get banned. |

**Priority order is evidence-based:** GitHub + DEV.to first (cheap, lasting);
HN/PH/Reddit after, measuring traffic *and* conversions per channel.

## Phase 4 — Technical SEO (ongoing)

- [ ] Core Web Vitals: monitor LCP/CLS/INP in GSC + CrUX.
- [ ] `next/dynamic` for below-the-fold components to cut JS / improve LCP.
- [ ] Re-enable static prerender once GTM is a build-time public var (see to.md).
- [ ] Add a Content-Security-Policy (with GTM inlined, decide nonce vs hash vs
  `unsafe-inline`); then `X-Frame-Options` can be replaced by `frame-ancestors`.
- [ ] When real ratings/reviews exist, add `aggregateRating` to the
  `SoftwareApplication` schema (never fabricate).

## KPIs (baseline first, then targets)

Record the **today** column from GSC after Phase 0 — the values below are
placeholders until then.

| Metric | Today (from GSC) | 3-month target | 6-month target |
|--------|------------------|----------------|----------------|
| Indexed pages | _ | +1-3 (real content pages) | +5-10 |
| Monthly impressions | _ | TBD from baseline | TBD |
| Monthly organic clicks | _ | TBD from baseline | TBD |
| Backlinks / referring domains | _ | 5+ / 3+ | 15+ / 8+ |
| Conversions (build/export) | _ | track, then target | track, then target |

## Priority order (revised)

1. ~~Fix blockers~~ — OG image done (generated); GTM stays runtime-env +
   `force-dynamic` by decision. See `to.md`.
2. **Phase 0** — GSC baseline + keyword research + conversion tracking.
3. **Make `/ats-score` a real SEO landing** (consolidate, don't duplicate).
4. **3-5 experience-grounded articles** + author/About (E-E-A-T).
5. **Distribution** — GitHub + DEV.to first; HN/PH/Reddit last, measured.
