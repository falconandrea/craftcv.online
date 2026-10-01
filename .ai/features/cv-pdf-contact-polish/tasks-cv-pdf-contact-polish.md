# Tasks: CV PDF Contact and Link Polish

> **Status**: Implemented on `feature/cv-pdf-contact-polish`
> **PRD**: [prd-cv-pdf-contact-polish.md](./prd-cv-pdf-contact-polish.md)

## File Map

- `state/types.ts` — extend the personal contact schema and defaults.
- `state/store.ts` — initialize and backward-compatibly hydrate phone/timezone in persisted state.
- `components/editor/personal-info-form.tsx` — expose optional phone and timezone inputs and normalize edited links.
- `lib/url.ts` — provide shared pure URL destination and display normalization.
- `lib/url.test.ts` — cover URL normalization edge cases.
- `components/editor/pdf-import-dialog.tsx` — use shared contact/link normalization for editor PDF imports.
- `app/dashboard/page.tsx` — use the same normalization for dashboard PDF and JSON imports.
- `lib/json-handler.tsx` — export new fields and normalize legacy/new JSON imports.
- `lib/json-handler.test.ts` — cover round-trip and backward-compatible contact shapes where testable without browser download plumbing.
- `app/api/ai/import-pdf/route.ts` — extract phone and timezone into the personal info schema.
- `lib/pii-masker.ts` — mask phone before AI Optimize requests.
- `lib/pii-masker.test.ts` — verify phone masking and source-data immutability.
- `components/ai/PrivacyNotice.tsx` — include phone in the masking notice.
- `components/pdf/cv-document.tsx` — implement the two header rows, clickable normalized URLs, project links, singular heading, and robust divider logic.
- `lib/ats-rules.pdf-export.test.ts` — cover rendered link/contact semantics and the ATS export regression.
- `lib/__fixtures__/craftcv-export.txt` — represent extracted text from the updated PDF fixture.
- `.ai/memory/progress.md` — record the completed feature after implementation and verification.

## Tasks

- [x] **U1 — Extend and migrate personal contact data**
  - Add optional phone and timezone values to the canonical `PersonalInfo` type and empty defaults.
  - Ensure persisted pre-feature Zustand state hydrates both missing values as empty strings without losing existing personal information.
  - Update representative typed fixtures that construct `CVState` so strict TypeScript remains truthful rather than relying on casts for the new contact shape.
  - Scenarios: fresh state; persisted state without new keys; persisted state with one or both new keys; reset restores empty values.

- [x] **U2 — Define shared URL behavior test-first**
  - Add failing focused tests for readable URL labels and absolute navigation targets.
  - Cover HTTP and HTTPS, leading `www.`, bare domains, nested paths, query strings, trailing slashes, surrounding whitespace, empty values, and malformed input that must not throw.
  - Implement the smallest pure utility that makes manual entries, imports, header links, and project links follow the same contract.
  - Run the focused URL test and confirm it passes.

- [x] **U3 — Add phone and timezone to the editor**
  - Render always-available optional inputs for phone and timezone in Personal Information.
  - Provide international-prefix guidance for phone and a manual timezone example such as `CET (UTC+1)`.
  - Keep both inputs controlled for legacy state where the keys were initially absent.
  - Normalize professional-link destinations at the editing boundary without changing the visible editor value unexpectedly while the user is typing.
  - Scenarios: empty fields; phone only; timezone only; both values; link entered with and without protocol.

- [x] **U4 — Preserve contacts across JSON and PDF import**
  - Add failing coverage for importing legacy JSON without phone/timezone and new JSON with both values.
  - Include cleaned phone and timezone values in JSON export.
  - Normalize missing fields and links during JSON import before store setters receive the data.
  - Extend the AI PDF extraction schema and instructions to return phone and timezone when present and empty strings otherwise.
  - Make both dashboard and editor PDF-import paths apply the shared normalization and preserve all personal fields.
  - Run the focused import/JSON tests and confirm they pass.

- [x] **U5 — Keep phone private in AI Optimize**
  - Add a failing PII-masker test proving phone is replaced with a descriptive placeholder and the source CV object is not mutated.
  - Extend masking to the new phone field while leaving personal information unavailable to AI-generated patches.
  - Keep phone out of the quick-reference prompt context.
  - Update the user-facing privacy notice to name phone among masked values.
  - Run the focused PII test and confirm it passes.

- [x] **U6 — Build the two-row PDF header**
  - Render populated location, email, phone, and timezone values in that fixed order on the first row.
  - Retain restrained direct-contact icons, adding phone and timezone icons consistent with the existing visual weight.
  - Render every populated professional link on a separate second row with no link icons.
  - Display each full host/path without protocol or `www.` while keeping an absolute clickable destination.
  - Prevent orphan separators and omit empty rows.
  - Scenarios: all fields; sparse contact combinations; links only; contacts only; long links wrapping on the second row.

- [x] **U7 — Make project URLs consistently clickable**
  - Render a non-empty project URL through the same display and destination rules as header links.
  - Preserve the current project role/link visual hierarchy and suppress whitespace-only URLs and their separator.
  - Add component-level assertions for visible text and `Link` destination.
  - Scenarios: absolute URL; bare domain; path/query string; no URL.

- [x] **U8 — Correct the experience label and divider edge cases**
  - Change only the English section heading from `Experiences` to `Experience`; retain the Italian heading.
  - Make the bottom-section divider logic depend on consecutive visible sections rather than specifically requiring Skills.
  - Prove Languages-to-Custom renders one divider when Skills is empty, and that no double/leading/trailing divider is introduced across Languages, Skills, Custom, and Certifications combinations.

- [x] **U9 — Update the real PDF-to-ATS regression**
  - Extend the representative CV export with international phone, timezone, LinkedIn, GitHub, and a project URL.
  - Refresh the verbatim `pdf-parse` fixture from the updated generated PDF.
  - Assert D02, D03, D04, and D08 pass and that link text remains extractable as full domains without protocols.
  - Replace the previous expectation that a CraftCV export must fail D02 because no phone field exists.
  - Run only the PDF export regression and directly affected ATS tests.

- [x] **U10 — Focused verification and project memory**
  - Run the focused Vitest files for URLs, JSON compatibility, PII masking, PDF rendering/export, and affected ATS checks.
  - Run `tsc --noEmit` because the shared `PersonalInfo` shape is consumed across the application.
  - Perform one manual preview check with all contact fields and one sparse-data check, confirming link navigation, wrapping, icon placement, divider behavior, and the singular heading.
  - Update `.ai/memory/progress.md` with the implemented scope and verified evidence.

## Coverage Check

| Requirement | Tasks |
|---|---|
| FR-01–FR-03 | U1, U3, U4 |
| FR-04–FR-08 | U2, U6 |
| FR-09–FR-11 | U2, U7 |
| FR-12–FR-14 | U8 |
| FR-15–FR-16 | U4 |
| FR-17 | U5 |
| FR-18 | U2, U3, U4, U6, U7 |
| FR-19 | U9 |
| Verification and memory | U10 |
