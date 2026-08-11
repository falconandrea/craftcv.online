# 📊 Progress Logic

> **Current Status**: ✅ Project MVP Completed, AI Feature Live. Dashboard + Editor Cyber Redesign done. ATS Deterministic Rules Engine implemented. JD Tailoring & Keyword Gap Analysis implemented. AI Optimize Grounding shipped with regression coverage. Token accounting live. Markdown for Agents content negotiation enabled. Content Signals declared in robots.txt. SEO: `/ats-score` turned into a real landing page, dynamic OG image + per-page social metadata fixed, sitemap carries real per-route dates. ATS pipeline hardened against the `aiUnavailable` contract + keyword ground truth, type regressions and shared constants (on `fix/ats-score-hardening`, pending merge + manual E2E).
> **Last Update**: 2026-08-11

## Recent Achievements
- [x] **Project Setup**: Documentation generated (PRD, Tech Stack, Flows).
- [x] **Analysis**: Analyzed current `app/editor/page.tsx` and Docker config.
- [x] **Foundation**: Removed Laravel refs, refactored store.
- [x] **Frontend Redesign**: Created Landing Page, Editor Sidebar, Split View.
- [x] **Core Features**: Added Languages support to Store, Form, and PDF.
- [x] **Bug Fixes**: Fixed layout, mobile menu, alerts (Toasts/Modals), PDF preview.
- [x] **Preview Update**: Implemented exact paginated Live PDF preview replacing HTML preview for matching output.
- [x] **Layout Redesign**: Replaced 3-column layout with sticky horizontal tab bar (`EditorTopNav`) + 2-column split (form 55% left, PDF preview 45% right). Action buttons moved into the tab bar row. Mobile: horizontal scrollable tabs + form/preview toggle.
- [x] **AI Optimize (Phase 4)**: Full feature implemented — chat UI, API route, PII masking, Zustand applyAiPatch, editor toggle, and AI Diff View Modal for reviewing proposed changes before applying.
- [x] **Bug Fixes**: Fixed inconsistent PDF section spacing caused by array item margins.
- [x] **Analytics Integration**: GA4, Microsoft Clarity, and CookieYes integrated via GTM.
- [x] **Polish & Deploy (Phase 5)**: App deployed to production domain `craftcv.online`.
- [x] **PDF Import**: Users can upload an existing PDF CV to auto-fill the form via AI-powered text extraction.
- [x] **Import UI Consolidation**: Unified PDF and JSON import methods into a new onboarding `WelcomeDialog`, updated `EditorTopNav` with an "Import CV" dropdown, and refactored `PdfImportBanner` into a `PdfImportDialog` modal.
- [x] **Bug Fixes**: Fixed `DOMMatrix is not defined` error in production occurring when processing PDFs by upgrading Docker Node image from v20 to v22.
- [x] **UI Polish**: Improved `WelcomeDialog` layout for better mobile and desktop experience (vertical stacking, hover effects, simplified icons, appropriate padding).
- [x] **Custom Section**: Added a free-text custom section with editable title (default "Interests"). Integrated across the full stack: types, store, editor form, navigation tabs, PDF generation, JSON save/load, AI optimize, AI import-pdf, AI diff view.
- [x] **Dashboard Redesign**: Created new `/dashboard` page as intermediate step between homepage and editor. Introduced shared `AppHeader` component with conditional nav links and CTA. Dashboard supports 3 actions: Start from Scratch, Import PDF (AI-powered), Import JSON. Removed `WelcomeDialog` from editor. Updated all homepage CTAs to route through `/dashboard`. Also migrated `cookies` and `privacy` pages to use `AppHeader`.
- [x] **Editor Cyber Redesign**: Full cyber/terminal aesthetic applied to the editor page. Replaced side-by-side layout with IDE-style single-pane toggle (Editor/Preview). Cyber-styled forms (`soft-field` inputs with glow focus), neon tabs (#ff00aa active), terminal-styled AI Sheet (`> AI_COACH.EXE`), diff modal with addition/deletion coloring (#b8ff00/#ff00aa). Removed all `dark:` variants in favor of permanent dark theme. Mobile bottom sheet removed, unified across all devices.
- [x] **Stats Counters**: Implemented anonymous JSON backend tracking for CV generations, AI messages, PDF uploads, and ATS tests with local Docker volume mapping.
- [x] **ATS Deterministic Rules Engine (P0-A)**: 16 deterministic lint rules (contacts, bullet quality, structure, ATS-specific) integrated into `/api/ai/analyze-ats`. New "CraftCV Lint Check" section in the frontend with category grouping and lint score.
- [x] **JD Tailoring & Keyword Gap Analysis (P0-B)**: LLM-powered keyword extraction from job descriptions + deterministic gap computation. New `/api/ai/jd-analyze` route + integrated into `/api/ai/analyze-ats`. New "Keyword Gap Analysis" section in ResultsDashboard with present/missing breakdown and "Fix in Editor" CTA.
- [x] **Structured Career Data Model (P2-D)**: Implemented TL;DR fields, AI quick-reference snapshot, synonym-aware skill evidence linking, and editor UI indicators for unevidenced skills. PRD Open Questions resolved. Token accounting added to `/api/ai/optimize` (provider-reported usage + estimated snapshot-vs-full-JSON savings) to validate the -40% token success metric.
- [x] **AI Optimize Grounding (P1-C) — regression hardening**: Added `app/api/ai/optimize/optimize-route.test.ts` covering the snapshot → `validatePatch` composition. "No regression" claim now backed by 116 passing tests + clean `tsc --noEmit`. Manual E2E of the 5 user-facing scenarios remains pending (needs live AI provider + browser session).
- [x] **Markdown for Agents (content negotiation)**: Implemented application-level `Accept: text/markdown` content negotiation so AI agents get a markdown representation of public pages while browsers keep getting HTML. Spec: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/. Files: `proxy.ts` (was `middleware.ts` in pre-Next.js-16 naming), `lib/markdown/agent-content.ts` (per-route markdown registry for `/`, `/privacy`, `/cookies`, `/ats-score`), `lib/markdown/negotiate.ts` (Accept parser + token estimator), `lib/markdown/negotiate.test.ts` (19 unit tests). Response sets `Content-Type: text/markdown; charset=utf-8`, `Vary: Accept`, and `x-markdown-tokens`. Verified end-to-end with curl on the running server: markdown served for `Accept: text/markdown` (and q-value preferences honored, including explicit `q=0` refusal); HTML served for browsers; API routes and unknown paths correctly bypassed. Added `lib/markdown/drift.test.ts` (45 invariants across 4 routes) to catch HTML/markdown drift.
- [x] **Content Signals (robots.txt)**: Declared AI content usage preferences via `Content-Signal: ai-train=no, search=yes, ai-input=yes` (draft-romm-aipref-contentsignals). Policy choice: indexed + agent-consumable (aligned with Markdown for Agents), but NOT available for AI training. Implementation: swapped `app/robots.ts` for a static `public/robots.txt` because Next.js's `MetadataRoute.Robots` serializer drops unknown directives like `Content-Signal`. Regression coverage in `lib/robots.test.ts` (7 assertions: directive presence, exact 3-category value set, policy values, placement inside User-agent block).
- [x] **Lessons Memory Gardening**: Compressed five lessons into concise, date-sorted entries while preserving all references and the existing preamble.
- [x] **Agent Context Routing**: Added area-based context loading and proportional/manual verification policies to `AGENTS.md`, adapted for the Next.js stack.
- [x] **SEO — `/ats-score` landing page** (merged to `develop`): rewrote the bare upload widget into a ~925-word server-rendered landing page (`components/ats/AtsScoreContent.tsx`) with H1→H2→H3 hierarchy; interactive widget split out as `components/ats/AtsScoreTool.tsx` to keep the SEO copy out of the client bundle. Every claim checked against `lib/ats-rules.ts` + `app/api/ai/analyze-ats/route.ts`. No FAQPage schema on purpose (Google restricted it); H1 left untouched pending Phase 0 keyword research.
- [x] **SEO — social metadata + sitemap** (merged to `develop`): dynamic OG image via `next/og` (`app/opengraph-image.tsx`, `force-static` to prerender at build), `pageOpenGraph()` helper in `lib/site.ts` to restate shared OG fields per page (Next merges `openGraph` wholesale in child segments), dropped root `twitter` title/description that masked per-page cards, fixed double "| CraftCV" suffix on `/privacy`+`/cookies`. Sitemap now carries real per-route `lastModified` instead of `new Date()` on every deploy.
- [x] **ATS pipeline hardening — two-axis code review** (on `fix/ats-score-hardening`, pushed, **not merged yet**): reviewed the branch (Spec + Standards) and fixed the two contract bugs flagged. (1) `aiUnavailable` now honored when the AI provider is unconfigured — the route serves the deterministic report with `aiUnavailable:true` (200) instead of a pre-parse `503`. (2) Keyword ground-truth enforced: `componentScores.keywordMatch` is overwritten with `gapReport.keywordScore` when concrete, so the two keyword numbers on screen cannot disagree. Plus type-safety restored (`FeedbackCategory`/`FeedbackStatus`/`FeedbackItem` exported, no more bare `string`), shared `lib/ats-constants.ts` (kills the duplicated `MAX_PDF_BYTES`/`MAX_JD_CHARS`), and `ATS_RULES.md` D08/A03 rows aligned to the engine's real behaviour. `tsc --noEmit` clean, 78 vitest assertions pass. **Pending: manual E2E of the unconfigured-AI path, then merge to `develop`.**

## Current Context
- **Goal**: All PRDs from the spec backlog are now completed.
- **Active Feature**: ATS pipeline hardening on `fix/ats-score-hardening` (pushed, not merged). Next: manual E2E of the unconfigured-AI path, then merge to `develop`. Deferred from review (conscious): smell-baseline items S1–S4 (duplicated regex in `checkRecentEndDate`, magic numbers, single-field `Bucket` interface, duplicated score banding) and the §7 scope creep (`optimize/route.ts` types, `verified-facts.ts` cleanup, `jd-analyze` rate limit, `app/ats-score/error.tsx`) — candidates for a separate cleanup PR.

## Features In Progress
| Feature | Status | Files |
|---|---|---|
| Editor Cyber Redesign | ✅ Done | `app/editor/page.tsx`, `components/editor/editor-content.tsx`, `components/editor/EditorTopNav.tsx`, `components/ai/*`, `app/globals.css` |
| Dashboard Redesign | ✅ Done | `app/dashboard/page.tsx`, `components/layout/AppHeader.tsx` |
| PDF Import | ✅ Done | `app/api/ai/import-pdf/route.ts`, `components/editor/pdf-import-banner.tsx` |
| Editor Layout Optimization | ✅ Done | `components/editor/EditorTopNav.tsx`, `components/editor/editor-content.tsx`, `app/globals.css` |
| CV Language Settings | ✅ Done | `.ai/features/cv-language/prd-cv-language.md`, `state/types.ts`, `components/pdf/cv-document.tsx` |
| Launch & Analytics | ⏳ Pending | `.ai/context/LAUNCH_STRATEGY.md`, `app/privacy`, `app/cookies` |
| ATS Score Feature | ✅ Done | `.ai/features/ats-score/prd-ats-score.md`, `app/ats-score/page.tsx`, `app/api/ai/analyze-ats/route.ts` |
| ATS Deterministic Rules Engine (P0-A) | ✅ Done | `.ai/features/ats-score-deterministic/`, `lib/ats-rules.ts`, `lib/ats-rules.test.ts` |
| JD Tailoring & Keyword Gap Analysis (P0-B) | ✅ Done | `.ai/features/jd-tailoring/`, `lib/jd-types.ts`, `lib/jd-analyze.ts`, `app/api/ai/jd-analyze/route.ts`, `components/ats/GapReport.tsx` |
| AI Optimize Grounding (P1-C) | ✅ Done | `.ai/features/ai-grounding/`, `lib/ai/grounding/`, `app/api/ai/optimize/route.ts`, `components/ai/ChatMessage.tsx`, `components/ai/AiDiffModal.tsx` |
| Structured Career Data Model (P2-D) | ✅ Done | `.ai/features/career-data-model/`, `lib/cv/quick-reference.ts`, `lib/cv/skill-evidence.ts`, `lib/cv/synonyms.ts`, `components/editor/skills-form.tsx` |
| ATS Pipeline Hardening (review pass) | ⏳ On branch `fix/ats-score-hardening` — pushed, pending manual E2E + merge | `app/api/ai/analyze-ats/route.ts`, `lib/ats-ai-response.ts`, `lib/ats-constants.ts`, `components/ats/ResultsDashboard.tsx`, `components/ats/Dropzone.tsx`, `docs/ATS_RULES.md` |

## Backlog
- [x] Add Google Tag Manager (GTM).
- [x] Add Google Analytics 4 (GA4) (via GTM).
- [x] Add Microsoft Clarity (via GTM).
- [x] Add CookieYes (via GTM).
- [x] Add Privacy & Cookie Policy pages.
- [x] Add Sitemap & robots.txt.
- [x] Add Google Search Console (GSC) verification.
- [x] Post on Reddit (`r/resumes`, `r/SideProject`, `r/webdev`) to gather initial user feedback.

## Spec Backlog — agentkit-seo research (ideas captured, not yet implemented)
Research source: [.ai/features/agentkit-seo-research/research-agentkit-seo.md](../features/agentkit-seo-research/research-agentkit-seo.md) (full idea map + prioritization).

Cross-cutting principle: **determinism before AI** — check with code whatever can be checked with code; reserve the LLM for the subjective residue.

| Priority | Cluster | Feature | PRD | Core idea |
|---|---|---|---|---|
| 🔴 P0 | A | ~~ATS Score deterministic rules engine~~ | ✅ **DONE** | Deterministic lint rules (16 checks) for contacts, bullet quality, structure, ATS-specific. Integrated server-side, shown in frontend as "CraftCV Lint Check". |
| 🔴 P0 | B | ~~JD Tailoring & Keyword Gap Analysis~~ | ✅ **DONE** | LLM keyword extraction + deterministic gap computation. Present/missing breakdown in ATS results. "Fix in Editor" CTA. Re-paste JD in AI Optimize (no transport). |
| 🟠 P1 | C | ~~AI Optimize grounding & anti-hallucination~~ | ✅ **DONE** | Anti-invention guardrail + VERIFIED FACTS protection + "needs verification" flag + STAR/XYZ enforcement. Structural cure for the fact-drift bug class (see `lessons.md`). |
| 🟡 P2 | D | ~~Structured career data model~~ | ✅ **DONE** | TL;DR field per entry + AI quick-reference snapshot (token savings) + skill evidence linking. Enabler for A/B/C. |

**Suggested order**: A → B → C (ship alongside/after B) → D (refactor during A/B/C). **Out of scope (Cluster E)**: multi-platform export (LinkedIn/GitHub/X generators) — scope expansion, noted only.

All PRDs are in PLANNING status. Next step per cluster: resolve its Open Questions → generate `tasks-*.md` → implement via the feature workflow.
