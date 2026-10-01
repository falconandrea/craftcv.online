# PRD: AI System Prompt Audit

> **Feature**: Evidence-based review and hardening of CraftCV's active AI prompts
> **Status**: Implemented — 2026-10-01 (live-provider comparison pending credentials)
> **Created**: 2026-09-29

## 1. Overview

CraftCV has four active LLM prompt surfaces that evolved across separate features: AI Coach optimization, PDF-to-CV import, ATS qualitative analysis, and job-description keyword extraction. Their surrounding schemas, deterministic rules, privacy behavior, grounding layer, and product date have changed since the prompts were introduced.

This feature audits those prompts against the current code contracts and verified user scenarios. It does not assume that newer or longer wording is better: prompt changes are made only where a concrete mismatch, ambiguity, stale instruction, injection risk, or reproducible behavior gap is identified.

## 2. Goals

- Inventory every production system prompt and the schema/validator that constrains its output.
- Detect prompt-to-code drift, contradictory instructions, stale temporal language, and duplicated responsibilities now handled deterministically.
- Improve factual grounding, multilingual behavior, security boundaries, and structured-output reliability where evidence supports a change.
- Establish repeatable synthetic evaluations so future prompt updates are reviewed against the same behaviors.
- Document ownership and a lightweight review cadence without adding runtime complexity.

## 3. Prompt Surfaces in Scope

1. **AI Coach / Optimize** — conversational advice plus optional `CVPatch` output.
2. **PDF Import** — untrusted extracted resume text to structured `CVState` data.
3. **ATS Qualitative Analysis** — extracted CV/JD text to supplemental scores and feedback.
4. **JD Keyword Extraction** — untrusted job-description text to structured hard-skill keywords and acronyms.

## 4. User Stories

1. As a CV editor user, I want AI Coach to reason from current CV data without inventing absent sections, metrics, or current-year claims.
2. As a PDF import user, I want extraction instructions to match every field the editor currently supports.
3. As an ATS Score user, I want AI feedback to complement deterministic checks rather than contradict or duplicate them.
4. As a maintainer, I want prompt changes reviewed with stable cases instead of relying on intuition and one-off manual conversations.

## 5. Functional Requirements

### 5.1 Inventory and contract mapping

- **FR-01**: Record each active system prompt, its runtime caller, input boundary, expected output schema, parser/validator, deterministic post-processing, and privacy boundary.
- **FR-02**: Record a last-reviewed date and responsible feature area for each prompt.
- **FR-03**: Confirm that prompt schemas match current TypeScript data contracts, including custom sections, TL;DR fields, phone/timezone work, nullable values, and fields forbidden from AI edits.

### 5.2 Audit criteria

- **FR-04**: Review every prompt for contradictory or overly broad instructions, unbounded output behavior, stale examples, misleading product claims, and reliance on model memory for current dates.
- **FR-05**: Review untrusted CV and JD inputs for explicit prompt-injection boundaries and delimiter clarity.
- **FR-06**: Review multilingual behavior for English and Italian inputs and CV-language separation.
- **FR-07**: Review whether AI responsibilities duplicate deterministic ATS, validation, or grounding logic; deterministic results remain authoritative.
- **FR-08**: Review privacy assumptions so masked contact data cannot be requested, regenerated, or leaked into output patches.
- **FR-09**: Review structured JSON requirements against the existing tolerant parsers and runtime validators; prompt wording must not substitute for server-side validation.

### 5.3 Prompt improvements

- **FR-10**: Change only prompt clauses tied to an identified audit finding and an evaluation case.
- **FR-11**: AI Coach must avoid fabricated or stale temporal claims such as treating a past year as current. Where current date matters, runtime context supplies it explicitly; otherwise wording remains date-neutral.
- **FR-12**: AI Coach distinguishes “source data is empty” from “detail was not supplied in this context” and does not declare a section absent without evidence.
- **FR-13**: PDF Import and JD extraction treat supplied text strictly as untrusted data and ignore instructions embedded inside it.
- **FR-14**: ATS qualitative analysis is framed as supplemental judgment and cannot override deterministic keyword ground truth or lint results.
- **FR-15**: Updated prompts keep the existing response contracts and continue to work with the configured OpenAI-compatible provider.

### 5.4 Evaluation and maintenance

- **FR-16**: Create a synthetic evaluation matrix covering normal, empty, multilingual, adversarial, schema-edge, and known-regression inputs for all four prompts.
- **FR-17**: Deterministic contract tests verify required schema vocabulary, forbidden personal-info edit fields, delimiters, and authoritative post-processing boundaries.
- **FR-18**: A manual live-provider comparison records baseline versus candidate behavior for the evaluation matrix without committing personal CV content or credentials.
- **FR-19**: Prompt review documentation explains when a future audit is warranted: schema changes, provider/model changes, repeated user-visible failures, security findings, or a periodic review after approximately six months.

## 6. Non-Goals

- Replacing deterministic ATS rules with LLM judgments.
- Changing LLM provider or model configuration as part of the prompt audit.
- Fine-tuning a model or building a general prompt-management platform.
- Adding a database, remote prompt registry, feature flags, or an admin UI.
- Optimizing prompts solely to make them shorter without behavioral evidence.
- Guaranteeing identical prose across different compatible models.

## 7. Technical Considerations

- Prompt text should live in testable modules that do not import route/runtime dependencies.
- Runtime schemas and validators remain the enforcement boundary; prompts provide instructions, not security guarantees.
- Evaluation fixtures must be synthetic and free of real PII.
- Live-provider evaluations are opt-in and must read credentials only from the existing environment variables.
- Audit findings should distinguish prompt defects from context-construction, parser, validator, and model-capability defects.
- Prompt edits should remain provider-agnostic unless the configured provider requires an officially documented behavior; any provider-specific decision must cite its primary documentation.

## 8. Error Handling

- Existing tolerant JSON parsing and response validation continue to handle fenced or noisy model output.
- A failed live evaluation does not modify production behavior automatically; it records the failing scenario for review.
- Missing provider credentials skip live comparisons with an explicit result while deterministic prompt-contract tests remain runnable.
- Prompt extraction must not create circular imports or cause route modules to execute during unit tests.

## 9. Testing Strategy

- Add contract tests for each extracted prompt module and its required/forbidden schema clauses.
- Add adversarial fixtures containing instructions inside resume/JD text and verify delimiter/instruction precedence through live evaluation when a provider is available.
- Reuse existing parser, grounding, ATS response, import, and route regression tests after any prompt edit.
- Compare baseline and candidate outputs on a fixed synthetic matrix, judging factuality, schema validity, grounding, language, completeness, and token usage.
- Run only affected prompt-contract and pipeline tests plus TypeScript checking; do not run the full suite by default.

## 10. Success Criteria

- All four production prompts have an explicit current contract and review date.
- Every implemented prompt change maps to a documented finding and regression/evaluation case.
- No current schema field is missing from the relevant extraction/edit prompt.
- AI Coach no longer relies on model memory for “current year” claims and does not label unavailable context as definitively absent.
- Deterministic ATS/grounding outputs remain authoritative and existing response parsing contracts remain green.
- Future audits can replay the same synthetic cases without using personal user data.

## 11. Initial Findings to Validate

- Prompt definitions are distributed across three route files and one library, making cross-contract drift easy.
- AI Coach has accumulated several overlapping `CRITICAL` rule blocks whose priority and interaction should be simplified and tested.
- The AI Coach prompt does not supply the current date, which permits stale year references in conversational feedback.
- PDF Import contains explicit prompt-injection defense; JD keyword extraction does not currently express an equivalent untrusted-data boundary.
- ATS qualitative analysis names specific ATS products and may imply fidelity that the application cannot verify; deterministic checks should remain the factual source of truth.
- Schema additions have historically required manually editing multiple prompt literals, as shown by custom-section and TL;DR changes.

