# PRD: AI Coach Project Context Completeness

> **Feature**: Preserve projects and detailed CV evidence in AI Coach context
> **Status**: Implemented 2026-09-29 (manual live-provider replay pending)
> **Created**: 2026-09-29
> **Related lesson**: Every editable field must be represented in the AI snapshot or deliberately routed as detail.

## 1. Overview

AI Coach currently receives a token-efficient CV snapshot that contains roles, skills, certifications, education, languages, custom content, and personal links, but no `projects` collection. A CV with populated personal projects can therefore produce a response claiming that projects are absent. The current detail-routing heuristic also recognizes only a narrow English trigger list, so a general review request in Italian can omit the existing experience and project descriptions and lead the model to qualify them as missing or unavailable.

The fix must complete the snapshot contract and make whole-CV review routing language-aware without returning to sending the full CV on every message.

## 2. Goals

- Ensure AI Coach always knows which personal projects exist.
- Give the model enough compact project evidence to avoid false “projects absent” claims.
- Include full experience/project detail when the user explicitly requests a general CV review in English or Italian.
- Preserve snapshot-first token savings for targeted or unrelated requests.
- Lock the real failure mode with deterministic regression coverage.

## 3. User Stories

1. As a user with side projects, I want AI Coach to acknowledge and evaluate them rather than claim that the section is empty.
2. As an Italian-speaking user asking for an overall CV review, I want the coach to see the same detailed evidence available to an English-speaking user.
3. As the product owner, I want context expansion to happen only when useful so AI token usage remains controlled.

## 4. Functional Requirements

- **FR-01**: `QuickReference` contains a `projects` collection for every project in `CVState`.
- **FR-02**: Each compact project entry includes its name, role, optional TL;DR, and link. When TL;DR is missing, the project still appears and is never represented as absent.
- **FR-03**: `toPromptString()` emits a dedicated `[ PROJECTS ]` section whenever at least one project exists.
- **FR-04**: Project ordering is deterministic and preserves the user's CV order.
- **FR-05**: A pure context-selection rule identifies explicit whole-CV review requests in both English and Italian.
- **FR-06**: Whole-CV review requests add full experience and project entries to the detailed context. Targeted requests continue to add only matching entries.
- **FR-07**: Empty arrays remain distinguishable from omitted context: the model may say projects/certifications are absent only when the source array is actually empty.
- **FR-08**: The regression fixture reproduces the reported shape: non-empty projects, non-empty experience descriptions, empty certifications, and an Italian whole-CV review request.
- **FR-09**: The resulting context contains all project names and the detailed experience/project evidence, while correctly leaving certifications empty.
- **FR-10**: Phone and other masked personal information introduced by the contact feature must not enter the project snapshot or detailed context.

## 5. Non-Goals

- Changing the LLM provider, temperature, or response parser.
- Sending the full CV JSON on every AI Coach message.
- Generating certifications that do not exist in the source CV.
- Changing project data, PDF rendering, or editor fields.
- Attempting to guarantee exact natural-language wording from a probabilistic model; the guarantee applies to the supplied context and factual section presence.

## 6. Technical Considerations

- Keep `buildQuickReference()` and `toPromptString()` pure and deterministic.
- Extract detail-routing into a pure, testable helper rather than growing the API route's inline string checks.
- Whole-CV intent matching should cover clear review language, not every occurrence of a generic word, to avoid needlessly expanding prompts.
- Specific project/company matching remains supported and should take precedence when the request is narrow.
- The existing token-accounting counters remain the measurement source; tests should assert routing behavior rather than a brittle absolute token count.
- Use synthetic regression data in the repository. The user's downloaded CV file and personal content must not be committed.

## 7. Error Handling

- Missing optional TL;DR and link values do not remove a project from the snapshot.
- Missing or empty user messages fall back to compact snapshot-only context.
- Context selection must not throw on empty experience/project arrays.
- Detailed context must use already masked `CVState` data received by the server.

## 8. Testing Strategy

- Add a failing quick-reference test in which multiple source projects are absent from the current prompt string.
- Add table-driven context-selection tests for Italian and English whole-CV reviews, narrow project requests, unrelated requests, and empty input.
- Extend the optimize route composition regression to prove that a general Italian review receives full experience/project details.
- Retain the token-savings sanity check for compact requests.
- Run only the quick-reference, context-selection, and optimize route regression tests plus TypeScript checking for the changed interfaces.

## 9. Success Criteria

- Every non-empty source project appears in the compact AI snapshot.
- A general Italian CV review receives full experience and project descriptions.
- An unrelated or narrow request does not automatically receive the entire CV detail payload.
- Empty certifications remain correctly reported as absent.
- The regression tests fail against the current implementation and pass after the fix.

## 10. Diagnosis Evidence

- The inspected JSON contains three projects with names, roles, links, and descriptions; two also have TL;DR values.
- The same JSON contains two experiences with non-empty descriptions and TL;DR values.
- The certifications array is genuinely empty.
- Executing the production `buildQuickReference()` and `toPromptString()` path produced a snapshot with no `projects` key and none of the source project names, yielding a deterministic `FAIL` verdict.
- Both JSON import surfaces already call `setProjects`, so the loss occurs after import, at AI snapshot construction.

