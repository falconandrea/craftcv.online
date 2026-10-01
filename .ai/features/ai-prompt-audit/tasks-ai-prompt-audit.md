# Tasks: AI System Prompt Audit

> **Status**: Implemented 2026-10-01 — live baseline-vs-candidate replay pending provider credentials (see docs/AI_PROMPTS.md §4)
> **PRD**: [prd-ai-prompt-audit.md](./prd-ai-prompt-audit.md)

## File Map

- `docs/AI_PROMPTS.md` — inventory, contracts, audit findings, ownership, and review cadence.
- `lib/ai/prompts/optimize.ts` — testable AI Coach prompt definition.
- `lib/ai/prompts/import-pdf.ts` — testable PDF extraction prompt definition.
- `lib/ai/prompts/analyze-ats.ts` — testable qualitative ATS prompt definition.
- `lib/ai/prompts/jd-extract.ts` — testable JD keyword extraction prompt definition.
- `lib/ai/prompts/prompts.test.ts` — deterministic prompt-contract and drift coverage.
- `lib/ai/prompts/evaluation-cases.ts` — synthetic, PII-free behavioral evaluation matrix.
- `app/api/ai/optimize/route.ts` — consume the audited AI Coach prompt and explicit date/context inputs.
- `app/api/ai/import-pdf/route.ts` — consume the audited extraction prompt.
- `app/api/ai/analyze-ats/route.ts` — consume the audited supplemental-analysis prompt.
- `lib/jd-analyze.ts` — consume the audited keyword extraction prompt.
- Existing focused parser, grounding, ATS response, quick-reference, and route test files — verify affected behavior without broad rewrites.
- `.ai/memory/progress.md` — record completed findings, changes, and verification evidence.
- `.ai/memory/lessons.md` — add only a narrow reusable lesson if the audit exposes a new verified drift pattern.

## Tasks

- [x] **(U1 — Inventory active prompt contracts**
  - Map the four production prompts to callers, inputs, output schemas, parsers/validators, deterministic post-processing, privacy boundaries, and existing tests.
  - Record the current prompt behavior before changing wording.
  - Identify schema fields and invariants shared across prompts so drift is visible.
  - Create the prompt inventory document with last-reviewed metadata and a six-month/event-driven review policy.

- [x] **(U2 — Build a synthetic evaluation matrix**
  - Define PII-free cases for normal, empty, Italian, English, adversarial, malformed, and known-regression inputs.
  - Cover AI Coach factual section presence, safe edits, bullet preservation, language separation, and current-date neutrality.
  - Cover PDF extraction schema completeness and embedded instruction attacks.
  - Cover ATS qualitative feedback alignment with deterministic ground truth.
  - Cover JD hard-skill extraction, importance classification, deduplication, empty results, and embedded instruction attacks.
  - Define pass criteria for factuality, schema validity, grounding, language, completeness, and bounded token use.

- [x] **(U3 — Extract prompts into testable modules without behavior changes**
  - Move each prompt literal into a dependency-light module while preserving its exact baseline text.
  - Update each caller to import the prompt without changing request or response contracts.
  - Add deterministic contract tests that can import prompts without executing route code.
  - Run focused tests to prove the extraction alone has not changed behavior.

- [x] **(U4 — Audit AI Coach prompt and runtime context**
  - Compare instructions against the current `CVState`, `CVPatch`, masking, grounding, context-selection, and array replacement behavior.
  - Test and resolve conflicting, repetitive, or ambiguous clauses, including general advice versus proposed edits.
  - Supply explicit runtime date context only where temporal reasoning is needed and require date-neutral wording otherwise.
  - Prevent claims that a section is absent when it was merely omitted from detailed context.
  - Preserve language separation, non-destructive patches, grounding, and user confirmation behavior.

- [x] **(U5 — Audit PDF Import prompt**
  - Compare the extraction schema with the current contact, experience, education, skills, certification, project, language, custom-section, and CV-language contracts.
  - Verify phone/timezone and other approved schema changes are included exactly once.
  - Tighten untrusted-text boundaries, missing-field behavior, wrapped-line handling, and bullet preservation only where evaluation cases expose gaps.
  - Re-run focused import parser and normalization coverage.

- [x] **(U6 — Audit ATS qualitative analysis prompt**
  - Separate subjective recruiter feedback from deterministic lint and keyword ground truth.
  - Remove or qualify unverifiable claims about reproducing named third-party ATS behavior.
  - Ensure no-JD and with-JD scoring instructions match the response contract and server-side keyword overwrite.
  - Re-run focused ATS response, route, and keyword consistency coverage.

- [x] **(U7 — Audit JD extraction prompt**
  - Add an explicit untrusted-data boundary and prompt-injection defense for job descriptions.
  - Verify hard-skill-only scope, importance classification, acronym handling, deduplication, and empty-result behavior against the validator.
  - Keep provider-neutral JSON instructions and existing failure handling.
  - Re-run focused JD extraction and gap-computation tests.

- [x] **(U8 — Compare baseline and candidate prompts**
  - Run deterministic contract tests for all four prompt modules.
  - When provider credentials are available, replay the synthetic matrix against baseline and candidate prompts and record pass/fail evidence without storing secrets or personal data.
  - Reject prompt edits that do not improve a documented failing case or that regress schema validity, grounding, language, or token bounds.
  - If live evaluation is unavailable, clearly mark it pending rather than claiming behavioral verification.

- [x] **(U9 — Focused integration verification and memory**
  - Run only the parser, grounding, ATS response, quick-reference/context-selection, JD, and route regressions affected by accepted prompt changes.
  - Run `tsc --noEmit` because prompts and schemas cross server boundaries.
  - Update `docs/AI_PROMPTS.md` with accepted findings, rejected ideas, review date, and the next audit trigger.
  - Update `.ai/memory/progress.md`; add a lesson only if a new narrow recurring failure mode was positively verified.

## Coverage Check

| Requirement | Tasks |
|---|---|
| FR-01–FR-03 | U1, U3 |
| FR-04–FR-09 | U1, U2, U4, U5, U6, U7 |
| FR-10–FR-15 | U4, U5, U6, U7 |
| FR-16–FR-18 | U2, U3, U8, U9 |
| FR-19 | U1, U9 |
