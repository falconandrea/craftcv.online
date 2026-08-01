# CraftCV — SEO Strategy Plan

> Last updated: 2026-08-01
> Status: Technical fixes done (branch `fix/seo-improvements`), content/distribution phase pending.

## Current situation

CraftCV is live, technically solid, and has a clear competitive edge:
**open-source + privacy-first + 16 deterministic ATS rules**. No competitor
has all three.

But the site is invisible in search. For "CraftCV" the SERP returns only
competitors (craft-cv.com, kraftcv.com, visualcv.com). The root cause:
not enough indexable content. The site is a single-page app with ~200 words.
Google can't rank what it can't read.

## What's already been fixed (branch `fix/seo-improvements`)

| # | Fix | File |
|---|-----|------|
| 1 | Canonical URL + `metadataBase` | `app/layout.tsx` |
| 2 | JSON-LD `SoftwareApplication` schema | `app/layout.tsx` |
| 3 | Open Graph + Twitter Card tags | `app/layout.tsx` |
| 4 | Removed `force-dynamic` (pages now static-prerendered) | `app/layout.tsx` |
| 5 | Fixed "toany" typo | `app/page.tsx` |
| 6 | `noindex` on `/dashboard` and `/editor` | their layouts |
| 7 | Sitemap cleaned (removed app pages + `llms.txt`) | `app/sitemap.ts` |
| 8 | Security headers + `poweredByHeader: false` + asset cache | `next.config.ts` |

**Action required before merge:** create `/public/og.png` (1200×630).

---

## Phase 1 — Landing pages (Week 1-2)

The homepage alone can't rank for competitive terms. We need dedicated
content pages that target specific search intents. Each one is a real page
(500-800 words), not a clone of the homepage.

| Route | Target keyword | Search intent |
|-------|---------------|---------------|
| `/ats-checker` | "ats checker", "ats resume checker" | Tool / validation |
| `/cv-templates` | "ats friendly cv template" | Browse / compare |
| `/ai-cv-writer` | "ai resume writer", "ai cv builder" | Find a tool |
| `/keyword-match` | "resume keyword checker", "ats keywords" | Gap analysis tool |

**Why it works:** This is exactly how Resume Worded, Jobscan, and VisualCV
built their traffic — each intent gets its own indexable page with a CTA to
the tool. The `/ats-score` route already exists and can be the foundation
for `/ats-checker`.

## Phase 2 — Blog (Week 3-4)

The blog wins long-tail SEO. CraftCV's audience (job seekers, career
changers) actively searches for guides on ATS, keywords, and CV writing.

**Content clusters (20+ articles target):**

### Cluster: ATS
- What is an ATS? (Complete guide)
- How to beat ATS in 2026
- ATS-friendly format guide (with examples)
- Top 10 ATS mistakes that get your CV rejected
- ATS vs human recruiter: what's different?

### Cluster: CV / Resume writing
- How to write bullet points with AI
- Quantify achievements: the complete guide
- CV format guide for software engineers
- How long should a CV be in 2026?
- Action verbs for resumes (200+ examples)

### Cluster: AI + Privacy
- AI resume optimizer comparison (ChatGPT vs CraftCV vs others)
- Is AI CV writing safe? (PII concerns)
- ChatGPT vs specialized CV tools
- Privacy-first resume tools: why it matters

### Cluster: Keywords
- Resume keywords for software engineers
- Keyword density for ATS: myth vs reality
- How to find resume keywords from any job description
- Keyword stuffing: how ATS detect and penalize it

**Format:** Next.js MDX blog under `/blog/[slug]`. Each article links to
the relevant tool page (internal linking).

## Phase 3 — Backlinks & distribution (Ongoing)

| Channel | Action | Angle |
|---------|--------|-------|
| GitHub README | Link to live site with keyword-rich anchor | "ATS-optimized CV builder" |
| Product Hunt | Launch / relaunch | Open-source + privacy + AI |
| HackerNews | "Show HN" post | Open-source ATS engine, deterministic rules |
| Reddit | r/jobs, r/cscareerquestions, r/resumes | Answer questions, link when relevant |
| Dev.to / Hashnode | Technical articles | "How I built a deterministic ATS lint engine" |
| LinkedIn | Andrea's posts | Tool-focused, not just process |

**Priority:** HackerNews "Show HN" has the highest ROI — the open-source
+ privacy angle plays perfectly to that audience.

## Phase 4 — Technical SEO (Ongoing)

- [ ] Verify property in Google Search Console
- [ ] Submit `sitemap.xml` in GSC
- [ ] Add `HowTo` + `FAQPage` schema on new content pages
- [ ] Internal linking: every blog post → relevant tool page
- [ ] Page speed: `next/dynamic` for below-the-fold components
- [ ] Core Web Vitals: monitor LCP/CLS/INP in GSC

## KPIs

| Metric | Today | 3-month target | 6-month target |
|--------|-------|----------------|----------------|
| Indexed pages (GSC) | ~4 | 15+ | 30+ |
| Monthly impressions | <100 | 2.000+ | 10.000+ |
| Monthly organic clicks | ~0 | 50+ | 300+ |
| Backlinks (Ahrefs free) | ~0 | 10+ | 30+ |
| Referring domains | ~0 | 5+ | 15+ |

## Priority order

1. **Create `/public/og.png`** — without it, social shares are invisible
2. **Verify GSC** — without Search Console, you're flying blind
3. **Ship one content page** (`/ats-checker` or `/cv-templates`) — more
   impactful than the blog because it converts
4. **Write 3-5 blog articles** — establish topical authority
5. **HackerNews / Product Hunt launch** — backlinks + referral traffic
