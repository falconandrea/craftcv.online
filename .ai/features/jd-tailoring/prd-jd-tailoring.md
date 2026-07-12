# 📋 PRD: JD Tailoring & Keyword Gap Analysis

> **Feature**: Job-description keyword engine + gap analysis report (diagnosis → cure)
> **Cluster**: B (from agentkit-seo research)
> **Status**: In Progress — Implementation started
> **Created**: 2026-07-03
> **Updated**: 2026-07-13
> **Source**: [`../agentkit-seo-research/research-agentkit-seo.md`](../agentkit-seo-research/research-agentkit-seo.md)

---

## 1. Overview

The biggest competitive gap vs tools like Teal/JobScan is **actionable keyword intelligence**: paste a job description, see exactly which target keywords your CV is missing, and get targeted fixes. CraftCV already has the pieces — `/ats-score` accepts an optional JD today, and AI Optimize already applies patches with confirmation — but they are not connected into a **diagnose → cure** loop.

This feature introduces a **keyword engine** that extracts hard/soft skills from a JD, compares them against the user's CV, and produces a **Gap Analysis Report**. Per the approved **B-3 placement decision**:

- **Diagnosis** lives in the `/ats-score` tool (paste CV + JD → gap report, top-of-funnel magnet).
- **Cure** lives in **AI Optimize** — the gap report surfaces a "Fix in editor" CTA that routes the user into the editor with the JD + missing-keyword list pre-loaded, where the AI proposes grounded patches.

The result is a conversion funnel: a weak score attracts the user, the gap report shows exactly what's missing, and the editor closes the loop.

## 2. Goals

- Turn the optional JD in `/ats-score` into a structured **gap analysis report** (present / missing / partial keyword matches).
- Provide the single highest-value "wow" insight: *"Your CV is missing 7 of the JD's hard skills."*
- Connect diagnosis to cure via a one-click path into AI Optimize with context pre-loaded.
- Keep keyword guidance **grounded** — contextualize keywords inside real experience, never keyword-stuff (see Cluster C for the guardrails).

## 3. User Stories

1. As a job seeker, I want to paste a JD and my CV and instantly see which hard skills the JD asks for that my CV lacks, so I know my real chances.
2. As a job seeker, I want the report to distinguish *fully missing* from *present but phrased differently*, so I don't waste effort.
3. As a career switcher, I want transferable skills in my CV mapped to the JD's vocabulary (e.g. my "Project Management" → their "Agile Delivery"), so I'm not filtered out unfairly.
4. As a job seeker with a low keyword score, I want a "Fix in editor" button that takes me straight to AI Optimize with the JD loaded, so the AI can tailor my bullets.
5. As an AI Optimize user arriving from a gap report, I want the AI to already know the missing keywords and propose targeted, grounded rewrites — not generic improvements.

## 4. Functional Requirements

### 4.1 Keyword engine (shared)
- **FR-01**: A server-side keyword engine (`/api/ai/jd-analyze`) that accepts a JD text and returns a structured `KeywordAnalysis`:
  - `hard_skills[]` (tools, platforms, technologies, methods) — high search value.
  - `soft_skills[]` (leadership, communication) — demonstrated via context, not listed.
  - `must_have[]` vs `nice_to_have[]` (inferred from JD phrasing: "required", "must have", "minimum" vs "preferred", "bonus", "a plus").
  - `acronyms[]` with expanded forms.
- **FR-02 (B4)**: **Acronym defense.** Every acronym keyword is paired with its expansion so both forms are matched (e.g. `SEO` ↔ `Search Engine Optimization`).
- **FR-03 (B5)**: **Skill translation hints.** For each missing hard skill, the engine optionally returns a `transferable_from[]` hint (skills in the user's CV that could be re-labeled to cover it) to power career-switcher suggestions.

### 4.2 Gap analysis
- **FR-04 (B2)**: **Gap computation.** Compare `KeywordAnalysis.hard_skills` against the user's CV text/JSON and classify each keyword as:
  - `present` (exact or near-exact match found),
  - `partial` (synonym/related term present),
  - `missing` (no match).
- **FR-05**: Produce a **Gap Report** with:
  - `keyword_score` (present / total must-have hard skills).
  - lists: `present[]`, `partial[]`, `missing[]` (each with the JD's exact phrasing).
  - `top_gaps[]` — the highest-impact missing must-haves, ranked.
- **FR-06 (B3)**: **Exact-phrase mirroring.** For `partial` matches, the report shows the JD's exact phrasing vs the CV's phrasing, nudging the user toward the JD's vocabulary (some parsers still do exact string matching).

### 4.3 Diagnosis surface — `/ats-score`
- **FR-07**: When a JD is provided to `/ats-score`, the existing Keyword Match component is replaced/augmented by the **Gap Report** view (present/partial/missing breakdown).
- **FR-08**: The report is the conversion driver: a prominent CTA **"Fix this in the editor →"** appears when `missing.length > 0`.
- **FR-09**: The CTA encodes the JD + `top_gaps[]` into a route/state payload so the editor + AI Optimize receive full context on arrival (no re-paste).

### 4.4 Cure surface — AI Optimize integration
- **FR-10**: AI Optimize accepts a **pre-loaded context** payload: `{ jd, missingKeywords, partialKeywords }`. When present, the initial assistant message reflects it: *"I can see you're missing N keywords for this role. I can help weave them into your experience — let's start with [top gap]."*
- **FR-11 (B6)**: The AI proposes **grounded bullet rewrites** that contextualize missing keywords inside real experience entries. It must **not** (a) add a skill the user cannot evidence, or (b) dump keywords into a list — both enforced by Cluster C guardrails.
- **FR-12**: The AI surfaces **"transferable skill" suggestions** (from FR-03) as options: *"You wrote 'Project Management' — for this role, re-labeling it as 'Agile Delivery' would match the JD. Apply?"*

### 4.5 No-stuffing guardrails (cross-ref)
- **FR-13**: Keyword integration must happen **inside experience bullets**, never as a comma-separated keyword block at the bottom of the CV. The AI is instructed accordingly and the result is checked (deterministic check possible via Cluster A engine).

## 5. Non-Goals (Out of Scope)

- **Auto-applying** keyword patches without user confirmation — the existing AI Optimize confirm/diff flow stays in control (see [`../ai-optimize/prd-ai-optimize.md`](../ai-optimize/prd-ai-optimize.md) FR-12…FR-14).
- Persisting JDs or gap reports server-side (ephemeral; the payload is carried client-side between surfaces).
- Salary/equity extraction from JDs.
- Multi-JD comparison ("which of these 3 roles am I closest to").
- Cover-letter generation (separate future feature).

## 6. Design Considerations

- **Gap report visual**: a two-column "In your CV ✅ / Missing ❌" layout with must-haves highlighted. Missing must-haves use the neon-pink `#ff00aa` fail color; partials use amber.
- **"Wow" moment**: a headline stat at the top — *"7 of 12 must-have skills missing"* — designed to be screenshot-shareable.
- **CTA prominence**: the "Fix in editor" button is the primary action when gaps exist; the download/share actions are secondary.
- **AI Optimize arrival**: a contextual banner ("Tailoring for: [role] · N gaps") persists while the JD context is active, with a "clear" action.

## 7. Technical Considerations

- **Framework**: Next.js 16 (App Router), TypeScript strict.
- **API**: New route `/api/ai/jd-analyze` returning structured `KeywordAnalysis` JSON (function-calling / structured output, same pattern as the existing `/api/ai/optimize`).
- **State handoff** (diagnosis → cure): carry `{ jd, top_gaps, missing, partial }` via URL query (compressed) or `sessionStorage` into `/editor`. The Zustand store gains an ephemeral `aiContext` slice (jd + gaps) consumed by AI Optimize on mount.
- **Matching strategy**: start with normalized string/substring + synonym map; semantic matching via embeddings is a **future** enhancement (avoid LLM cost per keyword in v1). Use the LLM only for the initial extraction (FR-01) and the rewrite proposals (FR-11).
- **Grounding dependency**: FR-11 depends on Cluster C (`prd-ai-grounding.md`) guardrails landing alongside or before. If C is delayed, ship B's diagnosis half first; defer the cure half.
- **PII**: the JD itself is not PII, but the CV sent for gap computation must go through the same masking as AI Optimize (names/emails/phones/links → placeholders).

## 8. Success Metrics

- Conversion: % of `/ats-score` (with JD) sessions that click "Fix in editor" → enter AI Optimize. Target ≥ 25%.
- Relevance: ≥ 90% of `missing[]` keywords are genuinely absent from the CV (low false-positive rate on "missing").
- Adoption: AI Optimize sessions arriving with a pre-loaded JD propose patches in the first turn > 80% of the time.
- No keyword-stuffing: 0 accepted patches that create a bare keyword list (verified via Cluster A check).

## 9. Open Questions (Resolved)

- **OQ-1** ✅ No transport needed — user re-pastes the JD in AI Optimize manually. Simpler, no state handoff complexity.
- **OQ-2** ✅ Always confirm — consistent with AI Optimize's confirmation principle. Proposed by the AI, applied by the user.
- **OQ-3** ✅ Hard skills only in v1 — soft skills are demonstrated via context, not listed, and noisy to match deterministically.
