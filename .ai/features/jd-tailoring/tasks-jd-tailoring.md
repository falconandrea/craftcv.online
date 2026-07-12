# Tasks: JD Tailoring & Keyword Gap Analysis (P0-B)

**Status:** Planning
**PRD:** `.ai/features/jd-tailoring/prd-jd-tailoring.md`
**Created:** 2026-07-13

---

## File Map

### Create
- `lib/jd-types.ts` — types: `KeywordMatchDetail`, `GapReport`, `KeywordAnalysis`
- `lib/jd-analyze.ts` — keyword extraction via LLM + deterministic gap computation
- `app/api/ai/jd-analyze/route.ts` — HTTP endpoint wrapping `lib/jd-analyze.ts`
- `components/ats/GapReport.tsx` — frontend gap analysis component

### Modify
- `app/api/ai/analyze-ats/route.ts` — integrate gap report when JD is provided
- `components/ats/ResultsDashboard.tsx` — add `GapReport` section + extend `AtsScoreData` type
- `lib/stats.ts` — add `jd_analyze` counter
- `.ai/features/jd-tailoring/prd-jd-tailoring.md` — update status → "In Progress", mark OQs resolved

### No Changes Needed
- `components/ats/Dropzone.tsx` — unchanged (already accepts JD textarea)
- `app/ats-score/page.tsx` — unchanged (already passes JD to API)
- `app/editor/page.tsx` / AI Optimize — no transport, user re-pastes JD manually

---

## Tasks

### U1. JD Types

**Files:**
- Create: `lib/jd-types.ts`

**What:**
Define all types for the keyword analysis domain. These are pure data types — no logic, no imports from React or Next.js.

**Types to define:**
- `KeywordCategory` — union: `"technology" | "tool" | "platform" | "methodology" | "other"`
- `KeywordImportance` — union: `"must_have" | "nice_to_have"`
- `MatchStatus` — union: `"present" | "missing"` (partial matches deferred per OQ-2; v1 is present/missing only)
- `KeywordMatchDetail` — `{ keyword: string; category: KeywordCategory; importance: KeywordImportance; status: MatchStatus; context?: string; cvPhrasing?: string }`
- `AcronymEntry` — `{ acronym: string; expansion: string }`
- `KeywordAnalysis` — `{ hard_skills: KeywordMatchDetail[]; acronyms: AcronymEntry[] }`
- `GapReport` — `{ keywordScore: number; totalMustHave: number; presentMustHave: number; present: KeywordMatchDetail[]; missing: KeywordMatchDetail[]; topGaps: KeywordMatchDetail[] }`

**Verify:**
- Types compile with `npx tsc --noEmit`
- `KeywordMatchDetail.category` and `importance` are discriminable unions, not `string`

- [ ] Define types in `lib/jd-types.ts`
- [ ] Verify with `npx tsc --noEmit`

---

### U2. Keyword Extraction + Gap Computation Engine

**Files:**
- Create: `lib/jd-analyze.ts`

**What:**
Two pure functions, one testable without network:

1. **`extractKeywords(jdText: string): Promise<KeywordAnalysis>`**
   - Calls the LLM (same `OpenAI` client as other routes) with a system prompt that asks for structured keyword extraction from the JD text.
   - System prompt must enforce: hard skills only (no soft skills), must_have vs nice_to_have classification based on JD phrasing, acronym extraction with expansions.
   - Parses the LLM response using the same `parseModelResponse` strategy (JSON → fence → brace extraction).
   - **No PII masking needed** — JD text is not PII.

2. **`computeGapReport(keywords: KeywordAnalysis, cvText: string): GapReport`**
   - Pure deterministic function. No LLM call.
   - Normalize both keyword and CV text (lowercase, trim).
   - For each hard_skill: check if it appears in `cvText` as a word-boundary match (case-insensitive regex `\bkeyword\b`).
   - Classify: match found → `"present"`, else → `"missing"`.
   - Compute `keywordScore` = `presentMustHave / totalMustHave * 100`.
   - Populate `topGaps` — the first 5 missing items sorted by importance (must_have first, then nice_to_have).
   - For `present` items, optionally extract a 60-char context snippet around the match.

**Edge Cases:**
- Empty JD text → throw or return empty `KeywordAnalysis`.
- JD with no extractable hard skills → empty `hard_skills[]`, `keywordScore = 100` (vacuously).
- Multi-word keywords like "Agile Project Management" → match as substring within word boundaries.
- Keywords with special characters (C++, .NET, Node.js) → escape regex special chars in the keyword before matching.

**Prompt for `extractKeywords`:**
- Use the same OpenAI client env vars (`AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `AI_PROVIDER_MODEL`).
- Temperature: 0.1 (maximally deterministic extraction).
- Max tokens: 2000.
- System prompt must ask for JSON output in the exact `KeywordAnalysis` shape.

**Verification:**
- `extractKeywords` can be tested manually via the API route (U3).
- `computeGapReport` can be unit-tested by calling it with a known `KeywordAnalysis` + fake CV text.

- [ ] Implement `extractKeywords()` with LLM call + response parsing
- [ ] Implement `computeGapReport()` with regex matching
- [ ] Verify: keyword with `C++` doesn't break regex
- [ ] Verify: multi-word keyword match works
- [ ] Verify: empty JD returns error
- [ ] Verify: JD with no hard skills returns `keywordScore: 100`

---

### U3. `/api/ai/jd-analyze` API Route

**Files:**
- Create: `app/api/ai/jd-analyze/route.ts`

**What:**
HTTP POST endpoint that wraps `lib/jd-analyze.ts`.

**Input:**
```json
{
  "cvText": "string (required, full CV plain text)",
  "jobDescription": "string (required, the JD to analyze)"
}
```

**Flow:**
1. Validate both fields present, non-empty.
2. Call `extractKeywords(jobDescription)`.
3. Call `computeGapReport(keywords, cvText)`.
4. Increment `jd_analyze` stat counter (fire-and-forget).
5. Return `{ gapReport }`.

**Error handling:**
- Missing/invalid fields → 400 `{ error: "..." }`.
- LLM extraction failure → 502 `{ error: "Keyword extraction failed." }`.
- Generic handler catches all other errors → 500.

**Pattern to follow:**
- Same `maxDuration = 60` as the ATS route.
- Same env var pattern for AI provider.
- Same error response format (`{ error: string }`).

**Verification:**
- `curl` test with a sample JD + CV text returns structured `gapReport`.
- Missing `cvText` returns 400.
- Empty `jobDescription` returns 400.

- [ ] Create route handler with validation
- [ ] Wire up `extractKeywords` + `computeGapReport`
- [ ] Add stat counter increment
- [ ] Test with curl: missing fields → 400
- [ ] Test with curl: valid input → `gapReport` in response

---

### U4. Integrate Gap Report into `/api/ai/analyze-ats`

**Files:**
- Modify: `app/api/ai/analyze-ats/route.ts`

**What:**
When a `jobDescription` is provided in the ATS form, also run the keyword engine + gap computation alongside the existing LLM ATS analysis. Add `gapReport` to the response.

**Changes:**
1. After PDF parsing (and before or after the deterministic checks), if `jobDescription` is non-empty:
   - Call `extractKeywords(jobDescription)`.
   - Call `computeGapReport(keywords, parsedText)`.
2. Add `gapReport` to the response JSON (alongside `score`, `deterministicChecks`, etc.).
3. The LLM call for ATS score still runs as before — the gap report is supplementary data, not a replacement.
4. The LLM still does its own keyword analysis in the feedback — the gap report is the structured deterministic version.

**Edge Cases:**
- If keyword extraction LLM fails, log the error and return the ATS response *without* `gapReport` (fail open — don't break the ATS test because of the bonus feature).
- If JD is empty, don't call the engine at all (no change from current behavior).

**Non-goals:**
- No changes to the LLM system prompt for ATS score.
- No changes to the response schema beyond adding the optional `gapReport` field.

**Verification:**
- Upload CV with JD → response includes `gapReport`.
- Upload CV without JD → response does NOT include `gapReport` (or it's `null`).
- If keyword extraction fails → ATS response still returns successfully without `gapReport`.

- [ ] Add keyword extraction + gap computation when JD present
- [ ] Append `gapReport` to response JSON
- [ ] Handle LLM failure gracefully (log, return response without gapReport)
- [ ] Test: with JD → gapReport present
- [ ] Test: without JD → gapReport absent
- [ ] Test: simulate LLM failure → ATS response still returns

---

### U5. GapReport Frontend Component

**Files:**
- Create: `components/ats/GapReport.tsx`

**What:**
A new client component that renders the `GapReport` data. Styled consistently with the existing cyber/terminal aesthetic (black background, neon colors, font-mono).

**Visual layout:**
1. **Headline stat** — `"7 of 12 must-have skills missing"` in large font, using the fail color (`#ff00aa`) when gaps exist, success color (`#b8ff00`) when all present.
2. **Keyword score** — circular or numeric percentage next to the headline.
3. **Two-column list:**
   - **Present ✅** — in green (`#b8ff00`), each item with its category/importance badge.
   - **Missing ❌** — in pink (`#ff00aa`), each item with its category/importance badge.
4. **"Fix in editor" CTA** — prominent button linking to `/editor` (no transport; user re-pastes JD there).
   - Label: `"Fix this in CraftCV Editor →"`
   - Only shown when `missing.length > 0`.
   - Styled as the primary action: full-width, `#b8ff00` background, black text, glow effect.

**Props:**
```typescript
interface GapReportProps {
  gapReport: GapReport;
  onReset?: () => void; // optional, to also offer "try another"
}
```

**Styling:**
- Match the existing `ResultsDashboard` section style (rounded corners, black/60 background, border-white/10).
- Use the same `StatusIcon` pattern (green check / pink X).
- Group by `must_have` vs `nice_to_have` within each column, with visual hierarchy.

**Edge Cases:**
- Empty `present` and `missing` arrays → show "No skills extracted from JD."
- `totalMustHave === 0` → show "No must-have skills found in this JD."
- Long keyword names → truncate with ellipsis if needed.

**Verification:**
- Component renders correctly with sample `GapReport` data.
- "Fix in editor" button visible only when `missing.length > 0`.
- Empty state renders without errors.

- [ ] Create `GapReport.tsx` with headline stat
- [ ] Render present/missing two-column list
- [ ] Add "Fix in editor" CTA (conditional on gaps)
- [ ] Handle empty/edge case states
- [ ] Verify visual consistency with ResultsDashboard

---

### U6. Integrate GapReport into ResultsDashboard

**Files:**
- Modify: `components/ats/ResultsDashboard.tsx`

**What:**
Extend `AtsScoreData` to include optional `gapReport`, and render `GapReport` when present.

**Changes:**
1. Add to `AtsScoreData` interface:
   ```typescript
   gapReport?: GapReport;
   ```
   (Import `GapReport` from `@/lib/jd-types`).

2. In the JSX, after the deterministic lint checks section and before "AI Analysis Breakdown", add:
   ```tsx
   {data.gapReport && (
     <GapReport gapReport={data.gapReport} />
   )}
   ```

**No changes needed:**
- The `Dropzone` already sends JD.
- The `page.tsx` already handles the response — `gapReport` comes through as part of the JSON and is typed via `AtsScoreData`.

**Verification:**
- With JD uploaded: gap report section appears in the results.
- Without JD: no gap report section (no visual regression for current users).

- [ ] Extend `AtsScoreData` with optional `gapReport`
- [ ] Import and render `GapReport` in the JSX
- [ ] Test: results with gapReport render the section
- [ ] Test: results without gapReport do NOT render the section

---

### U7. Stats Counter

**Files:**
- Modify: `lib/stats.ts`

**What:**
Add `jd_analyze` to the default stats object so the counter initializes correctly.

**Change:**
```typescript
return {
  cv_created: 0,
  ai_messages: 0,
  pdf_uploaded: 0,
  ats_tests: 0,
  ats_lint_checks: 0,
  jd_analyze: 0,   // <-- add this
};
```

**Verification:**
- `lib/stats.ts` compiles without error.
- No functional change — incremental counter is already handled by `incrementCounter("jd_analyze")` called in U3.

- [ ] Add `jd_analyze: 0` to default stats

---

### U8. Update PRD Status

**Files:**
- Modify: `.ai/features/jd-tailoring/prd-jd-tailoring.md`

**What:**
- Update status from `Planning` to `In Progress`.
- Mark the 3 Open Questions as resolved with the decisions:
  - OQ-1: Re-paste by user (no transport).
  - OQ-2: Always confirm (consistent with AI Optimize's diff/confirm flow).
  - OQ-3: Hard skills only in v1.

- [ ] Update PRD status + mark OQs resolved

---

## PRD Coverage Check

| FR | Task | Notes |
|---|---|---|
| FR-01 (jd-analyze route) | U2 + U3 | Keyword extraction engine + API route |
| FR-02 (acronym defense) | U2 | Acronyms extracted alongside hard skills |
| FR-03 (skill translation hints) | — | Deferred: `transferable_from[]` is a nice-to-have, not in v1 |
| FR-04 (gap computation) | U2 | `computeGapReport()` |
| FR-05 (gap report structure) | U2 + U5 | Types define it, component renders it |
| FR-06 (exact-phrase mirroring) | U2 | `context` snippet on present items (partial match deferred) |
| FR-07 (diagnosis in /ats-score) | U4 + U6 | Gap report returned by API, rendered in ResultsDashboard |
| FR-08 (Fix in editor CTA) | U5 | Button in GapReport component |
| FR-09 (CTA route payload) | — | Deferred: no transport, user re-pastes |
| FR-10 (AI Optimize pre-loaded) | — | Deferred: no transport |
| FR-11 (grounded rewrites) | — | Depends on Cluster C guardrails |
| FR-12 (transferable skill suggestions) | — | Depends on FR-03 |
| FR-13 (no keyword-stuffing) | — | Can be added as a deterministic check later via P0-A engine |
