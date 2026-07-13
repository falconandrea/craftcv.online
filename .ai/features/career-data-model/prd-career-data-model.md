# 📋 PRD: Structured Career Data Model

> **Feature**: TL;DR fields, AI quick-reference snapshot, and skill evidence linking for the CV data model
> **Cluster**: D (from agentkit-seo research)
> **Status**: ✅ Implemented — see [tasks-career-data-model.md](./tasks-career-data-model.md)
> **Created**: 2026-07-03
> **Source**: [`../agentkit-seo-research/research-agentkit-seo.md`](../agentkit-seo-research/research-agentkit-seo.md)

---

## 1. Overview

This is the **enabler** cluster — not user-facing on its own, but it makes Clusters A, B, and C more reliable, cheaper, and more accurate. It borrows three patterns from agentkit-seo's context-file spec and applies them to CraftCV's CV JSON (the Zustand store):

1. **TL;DR field** on every experience and project entry — a one-sentence summary that lets the AI (and recruiters) grasp an entry without parsing the full detail.
2. **Quick-reference snapshot** — a flat, token-efficient representation of the CV that is passed to AI prompts instead of the full JSON, cutting cost and improving consistency.
3. **Skill evidence linking** — every skill in the skills list is connected to where it is proven (a project, role, or certification), so "list a skill only if you can evidence it" becomes enforceable.

agentkit-seo's spec enforces these as Markdown conventions; CraftCV enforces them as **typed schema fields + UI + utilities**, which is stronger.

## 2. Goals

- Reduce AI prompt token cost and improve output consistency by sending a compact snapshot instead of the full CV JSON.
- Give every experience/project entry a TL;DR the AI can rely on for bullet generation and the user can use for quick scanning.
- Make "every skill is evidenced" a **machine-checkable** property, powering Cluster C's anti-invention guardrail and Cluster A's weak-bullet detection.
- Keep the model **backward-compatible** — existing saved JSON must load without migration errors.

## 3. User Stories

1. As an AI Optimize user, I want the AI to already understand the gist of each role without me re-explaining it, so its suggestions are sharper.
2. As a user, I want an optional one-line summary on each job entry, so my CV can show a scannable header and the AI has a reliable hook.
3. As a user, I want to see which of my listed skills have no backing experience, so I don't claim things I can't defend.
4. As the product owner, I want AI calls to cost less and behave more consistently, so margins improve and quality is predictable.

## 4. Functional Requirements

### 4.1 TL;DR field (D1)
- **FR-01**: Add an optional `tldr?: string` field to experience entries and project entries in `state/types.ts` (and the store). Constraint enforced in UI: ≤ 30 words / ~200 chars.
- **FR-02**: The editor form renders a "TL;DR (optional)" input for each experience/project, with a live word counter and helper text: *"One sentence: what it was, core tech, key result. Helps the AI and recruiter scanning."*
- **FR-03**: TL;DR is **not** rendered in the PDF by default in v1 (it is an AI/scanning aid). An optional "show TL;DR as entry subtitle" toggle is a future enhancement.
- **FR-04**: The AI (AI Optimize, import-pdf) is encouraged to **populate** the TL;DR when it processes an entry that lacks one, as a low-risk, high-value first suggestion.

### 4.2 Quick-reference snapshot (D2)
- **FR-05**: A pure utility `lib/cv/quick-reference.ts` that derives a flat, token-efficient snapshot from the full CV JSON:
  - identity (target role if known, current title, location),
  - `roles[]` — each as `title | company | period | tldr`,
  - `top_skills[]` — flattened, de-duplicated, capped (e.g. top 15),
  - `tools[]`,
  - `certs[]`, `education[]` (one line each),
  - links.
- **FR-06**: All AI prompts (optimize, import-pdf, jd-analyze) accept the snapshot as the **primary** context, with full detail loaded **on demand** only for the specific entry being rewritten. This is the single biggest token-cost lever.
- **FR-07**: The snapshot is the canonical input to Cluster C's vocabulary builder (D2 → C1), so the anti-invention guardrail and the prompt share one source of truth.

### 4.3 Skill evidence linking (D3)
- **FR-08**: Extend the skills model so each skill optionally carries `evidenced_in?: EntryRef[]` — references to the experience/project/cert entries where the skill appears.
- **FR-09**: A deterministic linker (`lib/cv/skill-evidence.ts`) auto-computes `evidenced_in` by scanning entry text for the skill term (and known synonyms). The user can also manually link/unlink.
- **FR-10**: The skills UI shows an evidence indicator per skill: ✅ evidenced / ⚠ unevidenced. Unevidenced skills are surfaced as a gentle warning: *"Listed but not found in any experience — recruiters may question this."*
- **FR-11**: Cluster C's anti-invention guardrail treats a skill as "in vocabulary" **only if** it is either evidenced or explicitly user-confirmed — closing the loophole where the AI could hide behind a bare skills-list entry.

### 4.4 Backward compatibility
- **FR-12**: All new fields are optional. Loading an existing saved CV JSON (pre-feature) must succeed with no migration; missing fields default to empty/undefined and are computed lazily (e.g. `evidenced_in` re-derived on load).
- **FR-13**: JSON export includes the new fields; older consumers ignore unknown keys safely.

## 5. Non-Goals (Out of Scope)

- Full agentkit-seo-style semantic tagging (`[ROLE]`, `[PROJECT]`, `[CERT]`) — CraftCV already has typed entries; tags would be redundant.
- A standalone "career context file" export format (Markdown) — a future "export as AI context" feature could use D2's snapshot, but is out of scope here.
- Changing the PDF layout to render TL;DRs or evidence badges (v1 keeps the PDF clean; these are editor/AI aids).
- Multi-CV profiles per user (no auth/storage yet).

## 6. Design Considerations

- **Editor forms**: TL;DR input sits directly under the entry title; evidence indicators sit inline in the skills list. Both follow the existing cyber form styling (`soft-field` inputs, neon focus).
- **Low friction**: TL;DR and evidence linking are **optional and auto-derivable** — the user is never forced to fill them, but they get value passively (auto-linked evidence) and actively (sharper AI).
- **Progressive disclosure**: the "unevidenced skills" warning is collapsible, not intrusive.

## 7. Technical Considerations

- **Framework**: Next.js 16, TypeScript strict. All new types live in `state/types.ts`; store actions extended in the Zustand store.
- **Pure utilities**: `quick-reference.ts` and `skill-evidence.ts` are pure functions → fully unit-testable. High coverage priority since Clusters B/C depend on them.
- **Snapshot stability**: the snapshot must be deterministic (sorted, de-duped) so the same CV always produces the same prompt context (reproducible AI behavior).
- **Migration**: none required (FR-12). No database exists; localStorage JSON loads lazily.
- **Performance**: snapshot derivation and evidence linking run client-side, memoized on CV change. Cheap (O(entries × skills)).

## 8. Success Metrics

- AI prompt token usage per optimize turn reduced ≥ 40% after switching to snapshot-first context (FR-06).
- ≥ 80% of experience/project entries have a TL;DR within 2 weeks of a user adopting the AI (AI auto-populates them).
- Every skill in the skills list is either evidenced or user-confirmed (FR-11 enforced) — 0 "ghost" skills feeding the AI.
- Zero load failures on pre-feature saved JSON (backward compat = 100%).

## 9. Resolved Questions

- **OQ-1 ✅ RESOLVED — Opportunistic only (no "generate all" button in v1).** The SYSTEM_PROMPT for `/api/ai/optimize` instructs the model to "ALWAYS populate [tldr] if empty or if rewriting the entry". This populates TL;DRs naturally as the user optimizes entries. A manual "generate all" button was deferred — it can be added later if adoption data shows users aren't getting TL;DRs populated fast enough.
- **OQ-2 ✅ RESOLVED — Shipped with a curated synonym map (~30 pairs).** Implemented in `lib/cv/synonyms.ts` (`ALIAS_PAIRS`): JS↔JavaScript, TS↔TypeScript, k8s↔Kubernetes, AWS↔Amazon Web Services, etc. Used by both `skill-evidence.ts` (linker) and `vocabulary.ts` (grounding). The map is **not** yet user-editable — extension point for later. Synonym matching runs alongside fuzzy suffix-stripping in `vocabulary.ts` (handles "React.js"↔"React").
- **OQ-3 ✅ RESOLVED — Auto-derived by evidence frequency, no manual override.** `buildQuickReference` (`lib/cv/quick-reference.ts`) sorts skills by `computeSkillEvidence` `evidencedIn.length` (desc) then alphabetically for determinism, takes top 15. No user override UI — the snapshot is a derived/ephemeral view, the source of truth remains the flat `skills[]` array the user edits directly.
