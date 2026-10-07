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
title: CraftCV — AI CV Builder with Rule-Based ATS Checks
description: Build your CV with AI Optimize checks against existing career details, 16 rule-based ATS checks and job keyword analysis. Free, open source, no account required.
---

# A stronger CV. Grounded in your experience.

Build and tailor your CV with AI Optimize, which checks proposed changes against your existing career details. Rule-based ATS checks and job keyword analysis help you spot concrete gaps.

## AI Optimize: improve your wording, keep your facts in view

Protected experience dates and education/certification years are preserved. Unsupported skills and entities flagged for review. New metrics flagged; confirmation in the diff review.

In the AI Optimize flow, proposed edits are compared with your existing CV. Protected dates are preserved, unsupported additions are flagged, and detected new metrics are flagged for verification. You review the proposed changes and decide whether to apply them.

Illustrative AI Optimize checks, not a live analysis.

Suggested skill: Kubernetes

Not found in your existing CV. Add only if you can support it.

Suggested result: +40% performance

New metric detected. Verify before applying.

Experience start date: 2020 → 2019

Change rejected. Original date preserved: 2020.

These checks help surface inconsistencies; they do not verify your career history or catch every unsupported claim.

## See what needs attention.

- **16 deterministic ATS checks**: Code checks extracted PDF text and filename for contacts, bullet quality, structure and parsing issues. The weighted lint score is separate from the AI evaluation.
- **Job keyword gap**: AI extracts job keywords; code checks whether those terms appear in the CV. Missing terms are prompts for review, not proof of missing skills.
- **Separate AI evaluation**: Feedback on formatting, impact and completeness. Reports do not guarantee ATS acceptance or an interview.

## Saved in your browser. Shared for AI when you choose.

Your editor data is saved in your browser. Export JSON or download a PDF. No account required.

AI features and ATS analysis send content through the server to an external provider. AI Optimize masks structured name, email, phone and profile-link fields; free text and chat may still contain identifiers. PDF import and ATS analysis send extracted text without that masking.

We use Google Analytics via GTM and Microsoft Clarity for analytics and session recording, with CookieYes for consent management.

## Open source. Open to inspection.

- Build my CV: https://craftcv.online/dashboard
- Check my CV: https://craftcv.online/ats-score
- Privacy policy: https://craftcv.online/privacy
- Source: https://github.com/falconandrea/craftcv.online
- ATS rules: https://github.com/falconandrea/craftcv.online/blob/main/docs/ATS_RULES.md
`;

const PRIVACY = `---
title: Privacy Policy | CraftCV
description: Our commitment to your privacy and data security.
---

# Privacy Policy

Last Updated: October 7, 2026.

## Local CV storage

CraftCV uses a local-first editor: CV data is saved in your browser's localStorage, without application-level encryption. We do not maintain a central database of user CVs. Export JSON for a portable backup; clearing browser storage removes the saved local copy.

## Server and AI processing

- CV content is sent through our server to the configured external AI provider for processing. Provider handling depends on its own policies.

- AI Optimize: In the standard editor flow, structured name, email, phone and profile-link fields are masked in the browser before transmission. Identifiers in free-text CV fields or chat messages may still be sent.

- PDF Import & ATS analysis: The PDF is uploaded to our server for text extraction. Import sends up to 15,000 characters of extracted text to the configured provider. ATS checks run on the full extracted text and filename; up to 15,000 characters may be sent for AI review when available. Neither flow masks that text, and neither sends the original PDF to the AI provider.

- Job descriptions: When supplied for keyword analysis or ATS review, job-description text is sent to the configured provider without PII masking.

- Generate TL;DR: The selected entry's title, role, description and CV language are sent to the provider without PII masking. This flow does not use AI Optimize's patch-grounding checks.

- Storage and retention: The application does not save uploaded PDFs or AI request content to a central CV database. Aggregate usage and token counters are saved server-side. Connection identifiers and request timestamps are held in memory for rate limiting. Error logs can include provider errors or response excerpts; their retention depends on deployment logging. External AI and analytics services handle data under their own policies; we do not promise zero retention by those services.

- Google Analytics 4 (GA4) / GTM: Traffic and feature-usage analytics.

- Microsoft Clarity: Visual session recording for debugging UI issues.

- CookieYes: Consent management.

GTM is loaded when a GTM_ID is configured. Analytics tags and consent settings are managed in the deployed GTM container and service settings.

Contact: falcon.andrea88@gmail.com
`;

const COOKIES = `---
title: Cookie Policy | CraftCV
description: Understanding tracking modules and browser storage.
---

# Cookie Policy

Last Updated: October 7, 2026.

## Browser storage

- cv-storage: editor CV data in localStorage, not an account session cookie.
- ai_privacy_dismissed: remembers dismissal of the AI Optimize privacy notice.

Consent services may use cookies or storage to remember your choices.

## Analytics and consent

GTM loads when configured. Google Tag Manager manages measurement scripts; Google Analytics 4 (GA4) measures traffic and aggregate feature usage. Microsoft Clarity provides interaction analytics and session recording. Data may include identifiers; it is not all described as anonymous.

Analytics tags, cookie names/lifetimes and consent controls are managed in the deployed GTM container and service settings. Where CookieYes controls are available, use them to review or change consent.
`;

const ATS_SCORE = `---
title: ATS CV Check — 16 Rule-Based Checks | CraftCV
description: Check your CV with 16 deterministic ATS lint rules. Add a job description for keyword gaps, plus a separate best-effort AI review. No account required.
---

# Check how ATS-friendly your CV is

Run 16 deterministic checks on structure, contact details, bullet quality and parsability. Add a job description to identify keyword gaps, with a separate AI review for additional feedback. No account required.

## Rule-based checks and AI review

16 deterministic checks run on the full extracted PDF text and filename. Contact details, bullet quality, structure and parsing issues contribute to a weighted lint score: pass earns full credit, warning half; optional GitHub/website checks never lower it. Findings can depend on the current date for open-ended roles.

A separate best-effort AI evaluation gives feedback on extracted text. The lint and AI scores are not averaged. Rule-based results remain available when AI review is unavailable. This does not reproduce a proprietary ATS or predict hiring outcomes.

With a job description and AI keyword extraction available, a keyword gap report matches extracted terms against CV text using code. The must-have gap score is separate; absent terms are not proof of absent skills.

## Processing

Your PDF is uploaded to the server for text extraction. Up to 15,000 characters of unmasked CV text may be sent to the configured provider for AI review; supplied job descriptions are sent for extraction and review. The original PDF is not sent to the provider.

- Check my CV: https://craftcv.online/ats-score
- Build my CV: https://craftcv.online/dashboard
- Privacy: https://craftcv.online/privacy
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
