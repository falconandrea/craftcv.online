# Tasks: ATS Score Deterministic Rules Engine

## File Map

### Create
- `lib/ats-rules.ts` — Pure functions for all deterministic checks. Each rule is a function `(text: string) => DeterministicCheck`. Exports the runner `runAllChecks(text: string, fileName?: string): DeterministicCheck[]` and types.
- `lib/ats-rules.test.ts` — Unit tests for each rule with mock CV texts (edge cases, empty, good CV).

### Modify
- `app/api/ai/analyze-ats/route.ts` — Import and run deterministic checks after PDF parsing, before AI call. Merge results into response.
- `components/ats/ResultsDashboard.tsx` — Add new section `DeterministicChecks` between component scores and AI feedback. Import `DeterministicCheck` type from `lib/ats-rules.ts`.
- `lib/stats.ts` — Add `ats_lint_checks` to Stats type (optional, for tracking).

---

### U1. Rule: Contacts — Email

**Files:**
- Create: `lib/ats-rules.ts`

**Scenarios:**
- Text contains `nome@dominio.com` → passed
- Text contains `email@` → failed (missing domain)
- Text without email → failed
- Text contains `example@email.com` → warning (example domain)

### U2. Rule: Contacts — Phone with international prefix

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenarios:**
- Text contains `+39 123 456 7890` → passed
- Text contains `123-456-7890` → warning (missing prefix)
- Text without phone → failed

### U3. Rule: Contacts — LinkedIn, GitHub, Personal website, Location

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenarios:**
- `linkedin.com/in/username` → passed
- `github.com/username` → passed
- `mariosite.com` (not linkedin/github) → passed (personal website)
- `New York, NY` / `Italy` / `CET` → passed (location)
- All missing → failed for each missing

### U4. Rule: Bullet — Action Verbs

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenarios:**
- Bullets starting with "Developed", "Led", "Created", "Implemented", "Managed" → passed
- Bullets starting with "Was responsible for", "Worked on", "Involved in" → warning
- Wordlist of ~100 action verbs included
- No bullets → skipped

### U5. Rule: Bullet — Length and Metrics

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenarios:**
- Bullet < 10 words → warning "too short"
- Bullet > 40 words → warning "too long"
- Bullet contains numbers (%, $, €, numbers) → passed for metrics
- No metrics in any bullet → warning

### U6. Rule: Structure — Sections and Dates

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenarios:**
- Headers "Experience", "Education", "Skills" present → passed
- Date pattern `MM/YYYY` or `Month YYYY` found → passed
- Gap > 6 months between consecutive dates → warning
- Recent role without end date (and without "Present"/"Current") → warning

### U7. Rule: ATS-Specific — Special characters, Skills, File name

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenarios:**
- Emoji or non-standard Unicode characters in the text → warning
- Skills separated by comma/semicolon/newline → passed
- Skills in free-text format → warning (not clearly parseable)
- File name "resume.pdf" or "CV.pdf" (case insensitive) → warning (generic name)

### U8. Rules Runner — `runAllChecks(text, fileName?)`

**Files:**
- Modify: `lib/ats-rules.ts`

**Scenarios:**
- Runs all rules in order and returns `DeterministicCheck[]`
- Computes `lintScore` (percentage of passed checks over total)
- If text is empty, all checks → failed with appropriate message

### U9. Unit tests

**Files:**
- Create: `lib/ats-rules.test.ts`

**Scenarios:**
- Mock "good" CV (CraftCV) — passes all rules
- Mock empty CV — all failed
- Mock text-only CV — no contacts, no bullets, no sections → targeted failures
- Mock CV with emoji and special characters — warning on A01

### U10. API Route Integration

**Files:**
- Modify: `app/api/ai/analyze-ats/route.ts`

**Actions:**
- After PDF parsing, call `runAllChecks(parsedText, pdfFile.name)`
- Include `deterministicChecks` and `lintScore` in the JSON response
- Keep backward compatibility (existing AI fields unchanged)

### U11. Frontend — Deterministic Checks Section

**Files:**
- Modify: `components/ats/ResultsDashboard.tsx`

**Actions:**
- Import `DeterministicCheck` from `lib/ats-rules.ts`
- Update `AtsScoreData` interface to include `deterministicChecks` and `lintScore`
- New "CraftCV Lint Check" section with:
  - Lint score (0-100) with bar chart
  - List of checks grouped by category (contacts, bullet_quality, structure, ats_specific)
  - passed/warning/failed icons matching the existing style

### U12. Stats counter (optional)

**Files:**
- Modify: `lib/stats.ts`

**Actions:**
- Add `ats_lint_checks` to the `Stats` type
- Call `incrementCounter("ats_lint_checks")` in the API route after the run
