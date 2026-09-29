# Tasks: AI Coach Project Context Completeness

> **Status**: ✅ Completed 2026-09-29
> **PRD**: [prd-ai-coach-project-context.md](./prd-ai-coach-project-context.md)

## File Map

- `lib/cv/quick-reference.ts` — include compact project context in the canonical snapshot and prompt string.
- `lib/cv/quick-reference.test.ts` — reproduce and lock project presence, ordering, and missing-TL;DR behavior.
- `lib/ai/context-selection.ts` — select compact, targeted-detail, or whole-CV-detail context deterministically.
- `lib/ai/context-selection.test.ts` — cover English/Italian review intent and narrow-request routing.
- `app/api/ai/optimize/route.ts` — compose the prompt with the tested context-selection result.
- `app/api/ai/optimize/optimize-route.test.ts` — verify the snapshot/detail composition at the route seam.
- `.ai/memory/progress.md` — record the completed bug fix and verification evidence.
- `.ai/memory/lessons.md` — reference the verified recurrence only if implementation confirms a narrower reusable lesson not already covered by the existing snapshot-completeness entry.

## Tasks

- [x] **U1 — Reproduce project omission at the production snapshot seam**
  - Added a failing regression using synthetic CV data with multiple populated projects, populated experience descriptions, and no certifications.
  - Asserted every project name appears in the serialized quick-reference prompt.
  - Asserted the source's empty certifications remain empty rather than being invented.
  - Ran the focused test and recorded the expected failure before implementation (3 failing tests: no `projects` key, no `[ PROJECTS ]` section, names absent).

- [x] **U2 — Complete the compact project snapshot**
  - Extended the quick-reference type and builder with project name, role, optional TL;DR, and link.
  - Serialized non-empty projects under a dedicated `[ PROJECTS ]` section in stable CV order.
  - Kept projects with missing optional TL;DR or link visible in the snapshot.
  - Existing determinism and token-savings assertions still pass with the expanded representation (10/10).

- [x] **U3 — Define multilingual detail routing test-first**
  - Added table-driven tests for clear whole-CV review requests in English and Italian (12 messages).
  - Covered targeted company/project requests, section-scoped requests, unrelated requests, empty messages, and false-positive phrases that must remain compact.
  - Implemented `selectContextDetail` — a pure selector returning compact, targeted-detail, or whole-CV-detail, with word-boundary prefix matching and a min-entity-length guard against substring false matches.
  - Kept explicit entity-name matching for specific experiences and projects, with precedence over broad review intent (33/33).

- [x] **U4 — Integrate context selection into AI Optimize**
  - Replaced the route's inline English-only broad-trigger heuristic with `buildCvContext` from `lib/ai/context-selection.ts`.
  - All experience and project entries are included only for explicit whole-CV review intent; empty arrays are dumped as-is so the model can only report a section absent when it is genuinely empty.
  - Only matching entries (or the mentioned section) are included for narrow requests.
  - Compact snapshot-only behavior is preserved otherwise; context is composed from the already masked CV payload (no personal contact fields — covered by an FR-10 regression).

- [x] **U5 — Lock the reported Italian review scenario**
  - Extended the route-composition regression with synthetic data matching the reported shape: 3 projects present, 2 experience descriptions present, certifications empty.
  - Asserted an Italian general-review message produces context containing all project names and the detailed experience/project evidence.
  - Asserted compact requests still avoid the full-detail block and retain a smaller prompt than full JSON (token-savings sanity retained).

- [x] **U6 — Focused verification and project memory**
  - All three focused test files pass: 53 assertions across quick-reference, context-selection, and optimize route regression.
  - `tsc --noEmit` clean (exit 0) after the `QuickReference` interface change.
  - Manual replay of one Italian whole-CV review against a live provider remains pending (same class of pending manual E2E as the AI Optimize grounding feature).
  - Updated `.ai/memory/progress.md` with root cause, scope, and verification evidence.
  - No new lessons entry: the projects omission is already covered by the existing 2026-07-14 snapshot-completeness lesson.

## Coverage Check

| Requirement | Tasks |
|---|---|
| FR-01–FR-04 | U1, U2 |
| FR-05–FR-06 | U3, U4 |
| FR-07–FR-09 | U1, U5 |
| FR-10 | U4, U5 |
| Verification and memory | U6 |
