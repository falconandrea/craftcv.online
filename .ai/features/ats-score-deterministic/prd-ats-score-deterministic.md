# PRD: ATS Score Deterministic Rules Engine

> **Status**: Draft
> **Cluster**: A (P0)
> **Parent**: ATS Score Simulator (`/ats-score`)

## 1. Goal

Add a layer of **deterministic** rules (no AI) to the current ATS Score Simulator, to make the analysis reproducible, explainable and testable. The rules run server-side after PDF parsing and before the LLM invocation.

Guiding principle: **determinism before AI** — whatever can be controlled with code must be controlled with code. AI remains only for subjective analysis (keyword match vs JD, qualitative impact assessment).

## 2. Architecture

### Current flow
```
Upload PDF → Text parsing → AI (LLM) → Score JSON
```

### New flow
```
Upload PDF → Text parsing → DETERMINISTIC RULES → AI (only keyword match + subjective) → Merge results → Final JSON
```

Everything in the same API route `/api/ai/analyze-ats`. The JSON response unifies both layers.

### Where rules run
**Server-side** (Node.js in the API route). The text extracted from the PDF is passed to pure functions that return deterministic results.

## 3. Deterministic Rules

Organized into categories:

### 📞 Contacts
| ID | Rule | Implementation |
|----|--------|----------------|
| D01 | Email present | Regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` on the text |
| D02 | Valid email format | Same regex — if match, valid |
| D03 | Phone present | Regex for international phone patterns |
| D04 | Phone with prefix | Prefix +39 / +1 / +44 etc. |
| D05 | LinkedIn URL | `linkedin.com/in/` |
| D06 | GitHub URL | `github.com/` |
| D07 | Personal website/portfolio | Personal URL (not linkedin/github) |
| D08 | Location/Timezone present | City, country or timezone in the contacts |

### 🔫 Bullet Point Quality
| ID | Rule | Implementation |
|----|--------|----------------|
| B01 | Action verbs present | Wordlist of ~100 action verbs (developed, led, created, implemented, etc.) |
| B02 | Bullets too short | < 10 words = warning |
| B03 | Bullets too long | > 40 words = warning |
| B04 | Metrics/Measurability | Presence of numbers, %, $, €, timeframes in the bullets |

### 📋 Structure
| ID | Rule | Implementation |
|----|--------|----------------|
| S01 | Recognizable standard sections | Headers like "Experience", "Education", "Skills", "Summary" |
| S02 | Dates present | Date pattern (MM/YYYY, Month YYYY, etc.) |
| S03 | Relevant date gaps | Gap > 6 months between consecutive experiences |
| S04 | Recent experiences without end date | Recent role without end year (if not "Present") |

### 🤖 ATS-Specific
| ID | Rule | Implementation |
|----|--------|----------------|
| A01 | Special characters/emoji | Detect non-standard Unicode characters |
| A02 | Skills in readable format | Skills separated by comma/semicolon/line |
| A03 | Uploaded file name | "resume.pdf" or "CV.pdf" → suggest a custom name |

## 4. Response Format

Extension of the current JSON. We add a `deterministicChecks` field:

```json
{
  "score": 72,
  "componentScores": { ... },
  "deterministicChecks": [
    {
      "id": "D01",
      "category": "contacts",
      "status": "passed" | "warning" | "failed",
      "label": "Email Address",
      "message": "Email found and valid.",
      "details": "mario.rossi@email.com"
    },
    {
      "id": "B01",
      "category": "bullet_quality",
      "status": "warning",
      "label": "Action Verbs",
      "message": "4 out of 12 bullets lack a strong action verb.",
      "details": "Weak bullets: 'Was responsible for...', 'Worked on...'"
    }
  ],
  "feedback": [ ... ]  // AI feedback (unchanged)
}
```

The frontend (`ResultsDashboard`) shows the deterministic checks in a new visual section, before or integrated with the AI feedback.

## 5. Impact on the Score

Deterministic rules **do not directly modify** the AI score. A discussion is needed on how to integrate them:

- **Option 1**: Separate "Lint Score" (0-100) shown alongside the AI score
- **Option 2**: The AI score "inherits" deterministic failures (if you fail contacts, the AI sees the warning and lowers the score)
- **Option 3**: Only qualitative warnings, no impact on the number

**Recommended**: Option 1 — separate lint score, shown as "CraftCV Lint Check". Transparent and explainable.

### Implemented (delta vs this PRD)

Option 1, with two clarifications decided during hardening:

- The lint score is **weighted**, not a percentage of passed checks:
  `passed = 1`, `warning = 0.5`, `failed = 0`. A warning signals something to
  improve, not a broken document.
- D04 (GitHub) and D05 (personal website) have **weight 0**: their own
  message declares them optional, so they are shown with the `OPTIONAL` badge
  but stay out of the denominator. In the response they arrive with
  `informational: true`.

The response also includes `lintScore`, `aiUnavailable` (true when the AI
layer fails and only the deterministic report is served), `textTruncated` and
`gapReport`. Full contract and table of the 16 rules with weights:
`docs/ATS_RULES.md`.

## 6. Testing

- Each rule is a pure function → testable with mock input
- Specific tests with a known CraftCV CV (must pass all rules)
- Tests with edge cases: empty CV, text-only CV, CV with special characters
- No LLM dependency for testing the rules

## 7. Not included (closed scope)

- Complex semantic rules (e.g. "the summary content is relevant to the role")
- Tone/formality analysis
- Frontend layout changes beyond adding a lint check section
