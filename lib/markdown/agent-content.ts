// Markdown representations of public-facing pages.
// Served when an agent requests `Accept: text/markdown`.
// Format follows Cloudflare's "Markdown for Agents" output layout:
//   1. YAML frontmatter (title / description / image)
//   2. Body Markdown (content only — navigation, scripts, styles stripped)
// Keep this file in sync with the rendered HTML in app/<route>/page.tsx.

export interface AgentMarkdown {
  // Raw markdown body, INCLUDING the YAML frontmatter block.
  body: string;
}

const HOME = `---
title: CraftCV - ATS-Ready CV Generator
description: Create professional, ATS-optimized CVs in minutes. Free CV builder with AI-powered optimization and PDF export.
---

# Build your professional CV in minutes

CraftCV is a free, local-first, AI-powered CV builder. No login required, no data stored, ATS-optimized output.

## Highlights

- **ATS Lint + Gap**: 16 deterministic rules.
- **Zero Data Stored**: Everything lives in your browser (local-first).
- **AI Extraction**: Upload a PDF and pre-fill the editor.
- **No Signup**: Free to use.

## Why CraftCV?

Built for professionals who value privacy and results. No tracking, no storage, just clean CV generation.

## Tailor your CV to any job — instantly

Paste a job description and the AI coach suggests targeted improvements: better keywords, stronger bullet points, relevant skills. You review every change.

- Chat-based suggestions with context.
- Privacy by design — PII masked before AI.
- One-click apply or skip each change.

## Features

- **ATS Score + Keyword Gap**: Upload your CV to test how ATS software parses it (16 deterministic lint rules), then paste a job description to see which keywords you are missing.
- **Privacy First**: Everything lives in your browser. No data stored. Export as JSON and keep full control.
- **PDF Import**: Upload an existing PDF and our AI extracts content to pre-fill the editor in seconds.

## Get started

- Launch the editor: https://craftcv.online/dashboard
- ATS score simulator: https://craftcv.online/ats-score
- Source code: https://github.com/falconandrea/craftcv.online
`;

const PRIVACY = `---
title: Privacy Policy | CraftCV
description: Our commitment to your privacy and data security.
---

# Privacy Policy

Last Updated: April 2026. Status: Active.

## 1. Local storage encryption

CraftCV is designed with a "Privacy-First" architecture. By default, all CV data you enter is stored exclusively in your browser's local storage. We do not maintain a central database of user CVs.

Your data never leaves your device unless you explicitly use our AI-powered features or export your data.

## 2. AI processing protocol

When using AI features (Optimization, PDF Import, ATS Score):

- CV content is temporarily transmitted to our AI providers (Nous Research at the moment) for processing.
- **Optimization & Import**: We attempt to mask Personally Identifiable Information (PII) like phone numbers and specific addresses before transmission.
- **ATS Score Simulator**: The original PDF document is transmitted **without** modifications or PII masking. This is a technical requirement to accurately simulate how an enterprise ATS (Applicant Tracking System) parses your actual file structure, layout, and metadata.
- Data is processed in real-time and is not stored permanently by our platform after the request is completed.

## 3. Analytics & subprocessors

We use the following services to monitor system health and improve user experience:

- Google Analytics 4 (GA4) / GTM: Behavioral tracking (anonymous).
- Microsoft Clarity: Visual session recording for debugging UI issues.
- CookieYes: Consent management.

## Contact

For security concerns or data inquiries: falcon.andrea88@gmail.com
`;

const COOKIES = `---
title: Cookie Policy | CraftCV
description: Understanding tracking modules and browser storage.
---

# Cookie Policy

Last Updated: April 2026. Status: Active.

## Core operations

Essential cookies are necessary for the website to function. They are used to manage user sessions and basic site navigation.

**Local storage manifest:**

- \`cv-storage\` — User CV state data.
- \`theme-storage\` — User UI preferences.

## Analytics beacons

These modules help us understand how users interact with the site. All data is processed anonymously.

- **Google Tag Manager** — Manages the deployment of various measurement scripts.
- **Google Analytics 4 (GA4)** — Behavioral mapping and anonymous traffic analysis to measure feature usage.
- **Microsoft Clarity** — Tracks interface interaction patterns (clicks, scrolls) to identify UX bottlenecks.

## Override preferences

Modify your tracking consent status at any time via the Cookie Banner (powered by CookieYes) located at the bottom of the screen.
`;

const ATS_SCORE = `---
title: ATS Score Simulator | CraftCV
description: Upload your CV to see how an Applicant Tracking System reads it. Discover missing keywords, formatting errors, and get actionable feedback.
---

# ATS Score Simulator

Upload your CV to see how an Applicant Tracking System reads it. Discover missing keywords, formatting errors, and get actionable feedback.

## Important disclaimer & privacy

This is an AI-powered simulation of generic enterprise ATS logic (like Workday, Taleo). Every company configures their ATS differently. A high score here does not guarantee a job interview.

**Privacy note**: The raw text extracted from your PDF is sent to our AI providers for parsing. Please do not upload sensitive documents if you do not consent to this.

## The two layers of the report

1. **Deterministic rules** — 16 deterministic checks implemented as pure functions, no AI involved: contact details, bullet quality, document structure and ATS-specific parsing traps. A passed check counts as full credit and a warning as half; the two checks whose own advice calls them optional (GitHub, personal website) never lower the score.
2. **AI evaluation** — a language model reads the extracted text and scores formatting, impact and completeness, then lists what to change. Paste a job description and it also produces a keyword gap report naming the terms your CV is missing.

## How to use

1. Visit https://craftcv.online/ats-score
2. Upload your CV PDF (max 5 MB).
3. (Optional) Paste a job description to turn on the keyword gap report.
4. Review the report: missing keywords, formatting errors, and actionable feedback.

This is an interactive, client-rendered tool. The HTML page is required to use it.
`;

// Path -> markdown body lookup. Keys are normalized routes (no trailing slash,
// root path is "/"). Only public, content-bearing routes are listed here.
// Client-only routes (dashboard, editor) and API routes intentionally excluded.
export const MARKDOWN_BY_PATH: Record<string, AgentMarkdown> = {
  "/": { body: HOME },
  "/privacy": { body: PRIVACY },
  "/cookies": { body: COOKIES },
  "/ats-score": { body: ATS_SCORE },
};
