# P2-D: Structured Career Data Model — Tasks

## Phase 1: Foundation (Types & Pure Utilities)

- [x] **T1 — Type system updates**
  - Add `tldr?: string` to `ExperienceEntry` and `Project` in `state/types.ts`
  - Add `EntryRef` interface and `EntryRefType` type
  - Add `SkillWithEvidence` interface (derived, not stored)
  - Update `defaultCVState` empty entries if needed
  - Verify `CVPatch` still works (tldr is part of ExperienceEntry/Project, auto-included)

- [x] **T2 — Synonym map**
  - Create `lib/cv/synonyms.ts` with `SYNONYM_MAP` (~30 tech pairs) and `normalize()` function
  - Create `lib/cv/synonyms.test.ts` — cover bidirectional resolution, case insensitivity, unknown terms pass through

- [x] **T3 — Skill evidence linker**
  - Create `lib/cv/skill-evidence.ts` with `computeSkillEvidence(cv): SkillWithEvidence[]`
  - Scans experience descriptions, project descriptions, certification titles, education degrees
  - Uses `normalize()` from synonyms for matching
  - Create `lib/cv/skill-evidence.test.ts` — cover: exact match, synonym match, no match, multi-entry evidence

- [x] **T4 — Quick-reference snapshot**
  - Create `lib/cv/quick-reference.ts` with `buildQuickReference(cv)` and `toPromptString(ref)`
  - Output: identity, roles (with tldr), topSkills (top 15 by evidence frequency), tools, certs, education, links
  - Deterministic: sorted, de-duplicated
  - Create `lib/cv/quick-reference.test.ts` — cover: determinism, missing tldr graceful handling, top_skills ranking

## Phase 2: Backend Integration

- [x] **T5 — Grounding system updates**
  - Update `vocabulary.ts`: use `normalize()` from synonyms when building vocab entries
  - Update `validate-patch.ts`: handle `tldr` field gracefully (no invention check on it), use synonym-aware matching in `checkInventions()`
  - Run existing grounding tests to confirm no regressions

- [x] **T6 — AI prompt integration**
  - `optimize/route.ts`: replace full JSON context with snapshot-first (`toPromptString`), add `tldr` to schema docs in SYSTEM_PROMPT, update Grounding Contract
  - `import-pdf/route.ts`: add `tldr` to extraction schema so imported PDFs get TL;DRs

## Phase 3: Frontend

- [x] **T7 — Editor UI: TL;DR fields**
  - `experience-form.tsx`: add "TL;DR (optional)" input below Role, max 200 chars, live word counter (X/30), helper text, cyber styling
  - `projects-form.tsx`: same TL;DR field
  - Both: wire to store via existing `updateExperience`/`updateProject` (tldr is part of the entry object)

- [x] **T8 — Editor UI: Skill evidence indicators**
  - `skills-form.tsx`: call `computeSkillEvidence()` via `useMemo`, show ✅/⚠ dot per skill badge
  - Add collapsible "Unevidenced skills" warning section at bottom
  - Tooltip on ⚠ skills: "Listed but not found in any experience"

## Phase 4: Polish & Verify

- [x] **T9 — JSON handler + backward compat + verification**
  - `json-handler.tsx`: add `tldr` cleaning to experience/project in `exportCVAsJSON()`
  - Verify: load pre-feature saved CV from localStorage → no errors
  - Verify: import old JSON export → backward compat
  - Run all tests: `npx vitest run`
  - Manual smoke test: AI Optimize with snapshot, PDF import with tldr, skills evidence indicators
