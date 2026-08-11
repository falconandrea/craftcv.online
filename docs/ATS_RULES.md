# ATS_RULES.md

## Why ATS Optimization Matters

Applicant Tracking Systems parse CVs as raw text. Any visual complexity can cause data loss.

---

## Forbidden Elements

- Tables
- Columns
- Icons
- Images
- Custom fonts
- Background colors

---

## Required Formatting

- Clear section headers
- Consistent date formats
- Simple bullet points
- Left-aligned text

---

# The lint engine (`lib/ats-rules.ts`)

Everything above is authoring guidance for `components/pdf/cv-document.tsx`.
This section documents the engine that *checks* an uploaded PDF, used by
`/ats-score` via `POST /api/ai/analyze-ats`.

## The 16 checks

Weight `0` means informational: the check is reported but never lowers the
score, because its own message tells the user the item is optional.

| ID | Check | W | Notes |
|----|-------|---|-------|
| D01 | Email address | 1 | Placeholder domains (`example.*`) warn instead of passing |
| D02 | Phone number | 1 | Passes only with an international prefix. Year ranges and VAT numbers are excluded |
| D03 | LinkedIn URL | 1 | Full URL or abbreviated `/in/username` |
| D04 | GitHub URL | 0 | Optional — informational only |
| D05 | Personal website | 0 | Optional. A bare domain passes; email domains are not counted |
| D08 | Location / timezone | 1 | City+country, city+US state, or an uppercase timezone. `Remote`/`Hybrid` alone is a warning |
| B01 | Action verbs | 1 | ≥70% of bullets starting with an action verb passes, ≥40% warns |
| B02 | Bullet length | 1 | Flags bullets under 10 or over 40 words |
| B03 | Measurable metrics | 1 | ≥50% of bullets with a quantity passes, ≥25% warns |
| S01 | Standard sections | 1 | ≥4 canonical section groups passes. Aliases of one group count once |
| S02 | Dates & timeline | 1 | ≥2 date references |
| S03 | Employment gaps | 1 | Parses date ranges, merges overlaps, flags gaps > 6 months |
| S04 | Roles without end date | 1 | Flags a range whose end is missing (a dangling dash) |
| A01 | Special characters | 1 | Emoji, private-use icon glyphs, box drawing, `U+FFFD`. Non-Latin scripts are fine |
| A02 | Skills parsability | 1 | A dedicated skills section in a separable format |
| A03 | File name | 1 | Flags generic names and draft markers (`final`, `v3`, `copy`, `(1)`) |

### Bullet extraction

`B01`–`B03` all measure the same list, produced by `extractBullets`:

1. If the text has explicit bullet glyphs, **only** those lines are used. The
   space after the glyph is optional — PDF extraction often glues it to the
   first word.
2. Otherwise it falls back to prose lines of 8+ words, excluding headings,
   contact lines and bare date ranges.

Never widen this to "any short line": the contact and date lines end up in the
denominator and every bullet check reports nonsense.

## Scoring

```
lintScore = round(100 * Σ(weight × statusScore) / Σ(weight))
statusScore: passed = 1, warning = 0.5, failed = 0
```

Warnings are half credit because they mark something to improve, not a broken
document. Weight-0 checks are excluded from both sums.

The lint score is deliberately **not** merged with the AI score: the two answer
different questions and are shown side by side. The one input the rules read
from outside the document is today's date, used to close a range marked
`Present`.

## API contract

`POST /api/ai/analyze-ats` (multipart: `pdf`, optional `jobDescription`)

- 5 MB max, PDF only; 10 requests / 10 minutes per client (`lib/rate-limit.ts`,
  per-process — move to a shared store if the deployment ever scales out).
- Deterministic checks run on the **full** extracted text; only the LLM prompt
  is truncated (15k chars for the CV, 8k for the job description).
- The AI layer is best effort. On failure the route still returns
  `deterministicChecks` + `lintScore` with `aiUnavailable: true`, and the UI
  drops the AI sections instead of erroring. Validation lives in
  `lib/ats-ai-response.ts`.
- With a job description, the deterministic keyword scan runs first and is
  injected into the prompt as ground truth, so the two keyword numbers on
  screen cannot disagree. `gapReport.keywordScore` is `null` when the posting
  lists no must-have skills.

## Testing

- `lib/ats-rules.test.ts` — per-rule unit tests, including regressions for
  every false positive fixed so far.
- `lib/ats-rules.pdf-export.test.ts` — runs against
  `lib/__fixtures__/craftcv-export.txt`, the verbatim `pdf-parse` output of a
  PDF rendered by `cv-document.tsx`. Hand-written strings do not reproduce how
  extraction splits lines, so a rule change is not verified until this suite
  passes. Refresh the fixture by re-rendering and pasting the output unchanged.
