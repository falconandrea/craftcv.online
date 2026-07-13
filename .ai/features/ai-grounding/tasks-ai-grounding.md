# Tasks: AI Optimize Grounding & Anti-Hallucination

> **PRD**: [prd-ai-grounding.md](./prd-ai-grounding.md)
> **Approach**: A — Post-LLM validation layer, fully server-side
> **Status**: Ready for implementation

---

## File Map

### Create
- `lib/ai/grounding/types.ts` — TypeScript types for VerifiedFact, VocabularySet, GroundingReport, AnnotatedPatch
- `lib/ai/grounding/verified-facts.ts` — extracts immutable facts (numbers, dates, IDs) from CVState
- `lib/ai/grounding/vocabulary.ts` — builds closed entity set (skills, tools, companies, roles, project names) from CVState
- `lib/ai/grounding/validate-patch.ts` — post-LLM validator: runs all 4 checks, returns AnnotatedPatch + GroundingReport
- `lib/ai/grounding/__tests__/verified-facts.test.ts` — unit tests for fact extraction
- `lib/ai/grounding/__tests__/vocabulary.test.ts` — unit tests for vocabulary building
- `lib/ai/grounding/__tests__/validate-patch.test.ts` — unit tests for the full validation pipeline

### Modify
- `state/types.ts` — extend `AiMessage` with optional `groundingReport`, add grounding-related types to CVPatch annotations
- `app/api/ai/optimize/route.ts` — integrate grounding pipeline after LLM response, add Grounding Contract to system prompt
- `components/ai/ChatMessage.tsx` — render grounding summary panel ("What the AI changed and what we blocked")
- `components/ai/AiDiffModal.tsx` — render 3 new visual states: flagged invention (neon-pink), needs verification (amber ⚠), rejected verified edit (greyed/struck-through)

---

## Tasks

### U1. Grounding Type Definitions

**Files:**
- Create: `lib/ai/grounding/types.ts`
- Modify: `state/types.ts`

**Spec:**
- Define `VerifiedFact` type: value (string), type (`numeric` | `temporal` | `identity`), source path in CV (e.g. `education[0].year`)
- Define `VocabularyEntry` type: term (string), category (`skill` | `tool` | `company` | `role` | `project`)
- Define `GroundingFlag` type with variants:
  - `flagged_invention`: term (string), category (string), message (string)
  - `needs_verification`: original (string | null), proposed (string), message (string)
  - `rejected_verified_edit`: fact (VerifiedFact), proposed (string), message (string)
  - `style_weakened`: original (string), proposed (string), message (string)
- Define `GroundingReport`: applied count, `flaggedInventions[]`, `needsVerification[]`, `rejectedVerifiedEdits[]`, `styleWarnings[]`
- Define `AnnotatedPatch`: extends CVPatch with per-section grounding flags
- Extend `AiMessage` in `state/types.ts` to include optional `groundingReport?: GroundingReport`

**Scenarios:**
- All types compile under TypeScript strict mode with no `any`
- Types are importable from both server (API route) and client (components)

- [x] Define types
- [x] Verify compilation

---

### U2. Verified Facts Extractor

**Files:**
- Create: `lib/ai/grounding/verified-facts.ts`
- Create: `lib/ai/grounding/__tests__/verified-facts.test.ts`

**Spec:**
- `extractVerifiedFacts(cv: CVState): VerifiedFact[]`
- Extract numeric facts: GPAs, scores, percentages, counts from `education[].year`, `certifications[].year`, `experience[].description` (regex for numbers with context like "3.4 GPA", "95%", "10k")
- Extract temporal facts: all `startDate`, `endDate` values from experience; `year` from education and certifications
- Extract identity facts: certification titles + issuers as composite keys, education degree + institution
- Each fact records its source path for traceability

**Scenarios:**
- CV with multiple experience entries → extracts all dates
- Education with year "2021" → captured as temporal fact
- Certification with title "AWS Solutions Architect" + issuer "Amazon" → captured as identity
- Experience description "• Improved latency by 40%" → captures "40%" as numeric fact
- Empty CV → returns empty array
- Description with no numbers → returns only dates/identity facts

- [x] Write tests
- [x] Run tests — expected: FAIL
- [x] Implement `extractVerifiedFacts`
- [x] Run tests — expected: PASS

---

### U3. CV Vocabulary Builder

**Files:**
- Create: `lib/ai/grounding/vocabulary.ts`
- Create: `lib/ai/grounding/__tests__/vocabulary.test.ts`

**Spec:**
- `buildVocabulary(cv: CVState): VocabularyEntry[]`
- Extract from `skills[]` → category `skill`
- Extract from `experience[].company` → category `company`
- Extract from `experience[].role` → category `role`
- Extract from `projects[].name` → category `project`
- Extract from `certifications[].title` → category `tool` (certifications often reference tools)
- Normalize: lowercase, trim, deduplicate
- `isInVocabulary(term: string, vocab: VocabularyEntry[]): boolean` — case-insensitive match with fuzzy tolerance for minor variations (e.g., "React.js" matches "React")

**Scenarios:**
- CV with skills ["React", "TypeScript", "Node.js"] → 3 skill entries
- CV with 2 experience entries → extracts 2 companies + 2 roles
- Duplicate "React" in skills and project description → deduplicated
- `isInVocabulary("react", vocab)` where vocab has "React" → true
- `isInVocabulary("Kubernetes", vocab)` where vocab has no Kubernetes → false
- `isInVocabulary("React.js", vocab)` where vocab has "React" → true (fuzzy)

- [x] Write tests
- [x] Run tests — expected: FAIL
- [x] Implement vocabulary builder
- [x] Run tests — expected: PASS

---

### U4. Patch Validator (Core Engine)

**Files:**
- Create: `lib/ai/grounding/validate-patch.ts`
- Create: `lib/ai/grounding/__tests__/validate-patch.test.ts`

**Spec:**
- `validatePatch(patch: CVPatch, cv: CVState): { cleanPatch: CVPatch; report: GroundingReport }`
- **Check 1 — Verified Facts Protection (FR-03)**: compare proposed values against `VerifiedFacts`. If a verified fact is altered (e.g., year changed, GPA changed), reject that specific change, add to `rejectedVerifiedEdits[]`
- **Check 2 — Anti-Invention (FR-05)**: scan proposed text changes for entities not in vocabulary. Extract candidate entities from proposed descriptions/summaries using simple heuristic (capitalized words, known tech patterns). New entities → add to `flaggedInventions[]`. The entity is NOT removed from the patch — it stays in `cleanPatch` but is annotated
- **Check 3 — Needs Verification (FR-08)**: scan proposed text for new quantified metrics (numbers + context like "40%", "3x", "10k users") that don't correspond to any existing verified number. Add to `needsVerification[]`
- **Check 4 — STAR/XYZ style (FR-12)**: check bullet rewrites for passive openers ("Responsible for", "Tasked with", "Helped with"). If a bullet had an active verb and now has passive → add to `styleWarnings[]`
- `cleanPatch` contains the patch with verified fact violations removed, but inventions and unverified metrics kept (they are flagged, not blocked)

**Scenarios:**
- Patch changes education year from "2021" to "2020" → rejected, appears in `rejectedVerifiedEdits`
- Patch adds "Kubernetes" to experience description where CV has no Kubernetes → flagged in `flaggedInventions`
- Patch adds "reduced latency by 40%" where original had no number → flagged in `needsVerification`
- Patch rewrites "• Built REST APIs" to "• Responsible for REST API development" → flagged in `styleWarnings`
- Clean patch (no violations) → empty report arrays, patch unchanged
- Multiple violations in one patch → all captured independently

- [x] Write tests
- [x] Run tests — expected: FAIL
- [x] Implement `validatePatch`
- [x] Run tests — expected: PASS

---

### U5. System Prompt — Grounding Contract

**Files:**
- Modify: `app/api/ai/optimize/route.ts`

**Spec:**
- Add a "Grounding Contract" section to the existing `SYSTEM_PROMPT` constant
- Content:
  - "Only reference skills, tools, roles, and companies that exist in the provided CV data"
  - "If the job description requires a skill the user lacks, say so honestly — do not fabricate experience"
  - "Do not alter dates, GPAs, scores, certification IDs, or any verifiable numbers"
  - "When suggesting quantified achievements, mark them as estimates the user should verify"
  - "Use active verbs (Built, Led, Designed, Implemented) — avoid passive openers (Responsible for, Tasked with)"
  - "Your output will be validated. Inventions and unverifiable claims will be flagged to the user"
- Position: append after existing Guidelines section, before the closing backtick of SYSTEM_PROMPT

**Scenarios:**
- System prompt compiles and is a valid string
- Existing behavior (JSON output format, bullet rules, schema) is preserved

- [x] Add grounding contract to system prompt
- [x] Verify the route still compiles

---

### U6. API Route Integration

**Files:**
- Modify: `app/api/ai/optimize/route.ts`

**Spec:**
- After parsing the LLM response (`parseModelResponse`), if `proposedChanges` exists:
  1. Call `validatePatch(proposedChanges, cvData)` to get `cleanPatch` + `report`
  2. Return `cleanPatch` as `proposedChanges` in the response
  3. Return `report` as `groundingReport` in the response
- If no `proposedChanges`, skip validation (pure conversational response)
- Import grounding utilities from `lib/ai/grounding/`
- Increment stats counters: `grounding_inventions_blocked` (count of flaggedInventions), `grounding_verifications_requested` (count of needsVerification)

**Scenarios:**
- LLM returns a patch with no issues → cleanPatch = original patch, report has empty arrays
- LLM returns a patch with a changed year → year change removed from cleanPatch, appears in report
- LLM returns a conversational message (no proposedChanges) → no grounding runs
- API error handling: grounding failure should not crash the response — fallback to unvalidated patch with a warning

- [x] Integrate validatePatch into route
- [x] Add stats counter increments
- [x] Test with manual API calls

---

### U7. Frontend Types & State

**Files:**
- Modify: `state/types.ts`

**Spec:**
- `AiMessage.groundingReport` is already typed in U1
- Ensure `AiOptimizePanel.tsx` passes the `groundingReport` from the API response into the message stored in state
- No new Zustand actions needed — the report is stored as part of the message object

**Scenarios:**
- API response with `groundingReport` → stored in AiMessage
- API response without `groundingReport` → field is undefined, no change in behavior

- [x] Wire groundingReport from API response to AiMessage state
- [x] Verify existing chat flow still works

---

### U8. ChatMessage — Grounding Summary Panel

**Files:**
- Modify: `components/ai/ChatMessage.tsx`

**Spec:**
- When `message.groundingReport` exists and has any non-empty array, render a compact panel below the message bubble:
  - Title: `> GROUNDING_REPORT` (mono, `#00f0ff`)
  - For each `flaggedInventions` entry: neon-pink (#ff00aa) badge with icon + `"[term]" — not in your CV`
  - For each `needsVerification` entry: amber badge with ⚠ icon + `"[metric]" — verify this number`
  - For each `rejectedVerifiedEdits` entry: greyed text with strikethrough + `"[fact]" — protected, not changed`
  - For each `styleWarnings` entry: subtle zinc text + `"passive opener detected"`
- Collapsible by default if > 3 items, expanded if ≤ 3
- Cyber aesthetic: consistent with existing mono font, dark backgrounds, neon accents

**Scenarios:**
- Report with 1 flagged invention → panel visible, single pink badge
- Report with 5+ items → collapsed by default with "show N more" toggle
- Empty report → no panel rendered
- Report with only rejectedVerifiedEdits → shows greyed strikethrough items

- [x] Implement grounding summary panel
- [x] Verify styling matches cyber aesthetic

---

### U9. AiDiffModal — Grounding Visual States

**Files:**
- Modify: `components/ai/AiDiffModal.tsx`

**Spec:**
- When rendering proposed text in the diff, annotate individual changes based on grounding flags:
  - **Flagged invention**: highlight the invented term/entity in neon-pink (#ff00aa) with a small tooltip/note: "Not in your CV — add only if you can evidence it"
  - **Needs verification**: highlight the metric/number in amber with ⚠ badge + note: "This number isn't from your CV. Confirm or edit before applying"
  - **Rejected verified edit**: show the original value as preserved (greyed, struck-through proposed value) with note: "Protected fact — AI change blocked"
  - **Style weakened**: subtle underline with tooltip: "Passive opener — consider using an active verb"
- The `needs_verification` items must NOT be one-click-appliable (FR-10): if any `needsVerification` flags exist, the APPLY button shows "CONFIRM & APPLY" with an amber border, and clicking it shows a brief confirmation step asking the user to acknowledge the unverified metrics
- Accept `groundingReport` as a new prop on `AiDiffModal`

**Scenarios:**
- Diff with no grounding flags → renders exactly as before (no regression)
- Diff with flagged invention in skills → pink highlight on the new skill
- Diff with needs_verification in experience description → amber highlight on the number
- Diff with rejected verified edit → shows the original value preserved
- Diff with needsVerification → APPLY button requires extra confirmation

- [x] Add groundingReport prop to AiDiffModal
- [x] Implement visual annotations for all 4 flag types
- [x] Implement confirmation gate for needs_verification
- [x] Verify no regression on clean patches

---

### U10. Wire Everything & End-to-End Test

**Files:**
- Modify: `components/ai/ChatMessage.tsx` (pass groundingReport to AiDiffModal)
- Modify: `components/ai/AiOptimizePanel.tsx` (pass groundingReport from API response to message)

**Spec:**
- Ensure the full pipeline works: user sends message → LLM responds → grounding validates → ChatMessage shows report → AiDiffModal shows annotated diff
- Manual E2E test scenarios:
  1. Ask AI to optimize for a JD that requires a skill not in CV → should see flagged invention
  2. AI adds a quantified metric → should see ⚠ verify badge
  3. AI tries to change a date → should see rejected/protected badge
  4. AI rewrites bullet with passive opener → should see style warning
  5. Clean optimization (no violations) → should work exactly as before

- [x] Wire groundingReport through component chain
- [ ] Manual E2E test all 5 scenarios
- [ ] Verify no regression on existing AI Optimize flow
