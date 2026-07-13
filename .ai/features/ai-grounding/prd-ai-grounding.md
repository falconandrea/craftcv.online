# 📋 PRD: AI Optimize Grounding & Anti-Hallucination

> **Feature**: Evidence-based guardrails for the existing AI Optimize assistant
> **Cluster**: C (from agentkit-seo research)
> **Status**: ✅ Approved — Ready for implementation
> **Created**: 2026-07-03
> **Source**: [`../agentkit-seo-research/research-agentkit-seo.md`](../agentkit-seo-research/research-agentkit-seo.md)

---

## 1. Overview

AI Optimize (see [`../ai-optimize/prd-ai-optimize.md`](../ai-optimize/prd-ai-optimize.md)) already applies AI-proposed patches to the CV with user confirmation. The core risk — and the central philosophy of agentkit-seo — is **fact drift**: an LLM rewriting copy to sound more confident while moving it *away* from the user's verifiable evidence. It invents metrics, adds skills the user never claimed, and inflates titles.

CraftCV has already hit one instance of this class of bug: the "False Positive Changes" issue in [`../../memory/lessons.md`](../../memory/lessons.md), where the AI returned the entire CV object as "changes". That was patched reactively. This feature is the **structural cure**: a grounding layer that separates *verified facts* from *stated goals*, blocks the AI from inventing claims, and flags any unverifiable metric it proposes.

It becomes especially important once Cluster B (JD Tailoring) ships: asking the AI to "add the missing keywords" is exactly the scenario where it is most tempted to fabricate experience. These guardrails must land alongside or before B's cure half.

## 2. Goals

- **Zero invention**: the AI must never add a skill, tool, role, or metric that is not sourced from the user's CV.
- **Protect verified numbers**: grades, scores, dates, and IDs are immutable from the AI's perspective.
- **Surface uncertainty honestly**: when the AI proposes a metric it cannot source, it flags it for the user rather than presenting it as fact.
- **Structural quality**: bullet rewrites follow the Action Verb + Task + Result (STAR/XYZ) structure.
- Make grounding **mechanical, not prompt-only** — validation runs on the LLM output, so a misbehaving model is caught regardless of instructions.

## 3. User Stories

1. As a job seeker, I want the AI to only ever claim things I actually did, so I don't get caught lying in an interview.
2. As a job seeker, when the AI suggests a number it can't verify (e.g. "improved performance by 30%"), I want it clearly flagged "needs your confirmation", so I decide whether it's defensible.
3. As a job seeker, I want my GPA, graduation date, and cert IDs to be untouchable by the AI, so an overzealous rewrite never corrupts my credentials.
4. As the product owner, I want AI Optimize to be trustworthy by construction, so the feature's reputation doesn't degrade from hallucination incidents.

## 4. Functional Requirements

### 4.1 VERIFIED FACTS extraction (C2)
- **FR-01**: A pre-processing step builds a `VerifiedFacts` set from the CV JSON before any AI call:
  - numeric facts: grades, GPAs, scores, percentages, counts, durations.
  - temporal facts: dates (start/end), years.
  - identity facts: cert IDs, award rankings.
- **FR-02**: `VerifiedFacts` is attached to the prompt context as an **immutable** block the AI is told it may reference but never alter.
- **FR-03**: Post-LLM, any proposed change that **alters a verified fact** (e.g. changes "GPA 3.4" → "GPA 3.8", or "2021" → "2020") is **rejected** and dropped from the patch with a logged reason.

### 4.2 Anti-invention guardrail (C1)
- **FR-04**: Build a **CV vocabulary set** — the closed set of skills, tools, company names, role titles, and project names actually present in the CV JSON.
- **FR-05**: Post-LLM, scan every proposed text change for **newly introduced entities** (skills/tools/companies not in the vocabulary set). Any such entity → **rejected** from the patch and surfaced to the user as: *"The AI suggested 'Kubernetes', which isn't in your CV. Add it only if you can evidence it."*
- **FR-06**: The AI is explicitly instructed: *"Only weave in skills/tools/roles that already exist in the provided CV. If the JD requires a skill the user lacks, say so — do not fabricate experience."*
- **FR-07**: Rejected inventions are **not silently dropped** — they are shown to the user in a "flagged for review" section, so the user can consciously decide to add a genuine skill they forgot to list.

### 4.3 Needs-verification flag (C3)
- **FR-08**: When the AI proposes a **new quantified metric** that does not correspond to any existing verified number (e.g. it adds "reduced latency by 40%" where the CV had no latency figure), the proposed change is annotated `needs_verification: true`.
- **FR-09**: In the diff/confirm UI, `needs_verification` patches render with a distinct **amber "⚠ verify" badge** and an inline note: *"This number isn't from your CV. Confirm or edit before applying."*
- **FR-10**: The user cannot apply a `needs_verification` patch in one click — they must either confirm it as-is or edit the value (forcing a conscious decision).

### 4.4 STAR/XYZ enforcement (C4)
- **FR-11**: Bullet-rewrite proposals are instructed to follow **Action Verb + Task + Result**: start with a strong action verb, state the task, end with a quantified result where one is verifiable.
- **FR-12**: A lightweight post-check classifies each rewritten bullet. If a rewrite **introduces passive openers** ("Responsible for", "Tasked with") that weren't in the original, it is flagged `style: weakened` and returned for revision rather than applied.

### 4.5 Grounding report
- **FR-13**: Alongside each AI response, a compact **grounding summary** is computed: `applied`, `flagged_inventions[]`, `needs_verification[]`, `rejected_verified_edits[]`. This is what renders in the diff modal, making the guardrails visible (and auditable) to the user.

## 5. Non-Goals (Out of Scope)

- Replacing the existing confirm/diff flow — grounding layers *under* it; the user still approves every patch.
- Blocking the user themselves from editing verified facts manually (the guardrails constrain the **AI**, not the human).
- Automated fact-checking against external sources (LinkedIn, GitHub) — out of scope; we ground only against the user's own CV.
- Rewriting the entire AI Optimize chat architecture — this is an additive validation layer + prompt changes.

## 6. Design Considerations

- **Diff modal extensions** (existing component `components/ai/ChatMessage.tsx` + diff modal): add the three new visual states — `flagged_invention` (neon-pink with "not in your CV" note), `needs_verification` (amber ⚠ badge), `rejected_verified_edit` (greyed, struck-through, "protected fact").
- **Honesty as a feature**: the grounding summary is surfaced as a small "What the AI changed (and what we blocked)" panel, reinforcing user trust.
- **Cyber aesthetic continuity**: flags use the existing palette (`#ff00aa` for blocks, `#b8ff00` for applied, amber for verify).

## 7. Technical Considerations

- **Framework**: Next.js 16, TypeScript strict, no `any`.
- **Where validation runs**: the post-LLM validation (FR-03, FR-05, FR-08, FR-12) runs in the **API route** (`/api/ai/optimize`), so the client never receives an un-grounded patch. The existing `getEffectivePatch` deep-comparison in `components/ai/ChatMessage.tsx` (from the lessons.md fix) is the client-side backstop, not the primary guard.
- **Shared utilities**:
  - `lib/ai/grounding/verified-facts.ts` — extracts the immutable fact set.
  - `lib/ai/grounding/vocabulary.ts` — builds the CV entity vocabulary (can reuse the keyword-extraction logic from Cluster B's engine).
  - `lib/ai/grounding/validate-patch.ts` — the post-LLM validator returning the structured grounding summary.
- **Dependency**: FR-05 (vocabulary) benefits from Cluster D's quick-reference snapshot (D2) if available; otherwise it parses the full CV JSON directly.
- **Prompt engineering**: the system prompt gains a "Grounding contract" section. The model is told its output will be validated and inventions will be surfaced to the user — this alone measurably reduces fabrication.
- **PII**: unchanged — the existing masking layer (AI Optimize FR-17) runs before grounding; grounding operates on masked content where relevant.

## 8. Success Metrics

- Zero accepted patches introduce a skill/tool/company not present in the original CV (FR-05 enforced = 100%).
- Zero accepted patches alter a verified numeric/temporal/identity fact (FR-03 enforced = 100%).
- ≥ 95% of `needs_verification` patches are either edited by the user or consciously confirmed (not one-click-applied blindly).
- Reduction in user-reported "the AI made something up" incidents to zero after launch.

## 9. Resolved Questions

- **OQ-1 ✅ RESOLVED**: Invention rejection uses **flagged for review** — inventions are shown to the user with a "not in your CV" badge. The user decides whether to add or discard. Never silently dropped (FR-07).
- **OQ-2 ✅ RESOLVED**: Unverifiable metrics are **allowed-but-flagged** — the AI may propose new quantified metrics, but they render with an amber ⚠ "verify" badge. The user must explicitly confirm or edit before applying (FR-09, FR-10).
- **OQ-3 ✅ RESOLVED**: Grounding summary is **ephemeral** — lives only in the current API response. Only aggregate counters (total inventions blocked, verifications requested) are tracked via the existing stats backend.

## 10. Architecture Decision

**Approach A — Post-LLM validation layer, fully server-side**:
- All validation (verified facts, anti-invention, needs-verification, STAR check) runs in the API route `/api/ai/optimize` after the LLM response.
- The client receives a patch already annotated with grounding metadata (`GroundingReport`).
- The diff modal and ChatMessage are extended to render the 3 new visual states (flagged invention, needs verification, rejected verified edit).
- The system prompt is enriched with a "Grounding contract" to reduce inventions at the prompt level.

