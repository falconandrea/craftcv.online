# PRD: CV PDF Contact and Link Polish

> **Feature**: Two-row contact header, optional phone/timezone, consistent clickable URLs, PDF section polish
> **Status**: Approved — implemented on `feature/cv-pdf-contact-polish`
> **Created**: 2026-09-29

## 1. Overview

Improve the generated CV header and project presentation without changing the overall PDF template. The header will separate direct contact details from professional links, expose optional phone and timezone fields, and render every URL as readable clickable text without its protocol. The same feature also fixes the missing divider before a custom section when Skills is empty and changes the English section heading from `EXPERIENCES` to `EXPERIENCE`.

The change must preserve CraftCV's local-first model, remain compatible with existing localStorage and JSON exports, and strengthen rather than regress the deterministic ATS checks.

## 2. Goals

- Make contact details easier to scan through a stable two-row PDF header.
- Let remote candidates publish an optional phone number and timezone.
- Keep full domains visible to recruiters and ATS parsers while retaining clickable destinations.
- Make project URLs clickable without showing `http://`, `https://`, or `www.`.
- Ensure every pair of adjacent visible PDF sections has a divider.
- Preserve old saved CVs and imports that do not contain phone or timezone.

## 3. User Stories

1. As a candidate, I want my location, email, phone, and timezone grouped together so recruiters can immediately understand how and when to contact me.
2. As a candidate, I want GitHub, LinkedIn, portfolio, and other links shown in full without protocol noise so their destinations remain obvious.
3. As a recruiter, I want project URLs to be clickable in the preview and downloaded PDF.
4. As an existing CraftCV user, I want previously saved or exported CV data to keep loading after the contact schema changes.
5. As an ATS Score user, I want a CraftCV-generated PDF with an international phone number and recognizable links to satisfy the corresponding deterministic checks.

## 4. Functional Requirements

### 4.1 Contact data and editor

- **FR-01**: `PersonalInfo` supports optional `phone` and `timezone` string values. Both are empty by default and remain optional.
- **FR-02**: The Personal Information editor always exposes both inputs. Phone guidance recommends an international prefix; timezone guidance uses an explicit example such as `CET (UTC+1)`. Values are free text and are not rejected by strict validation.
- **FR-03**: Existing localStorage data and JSON files without either field load successfully and resolve missing values to empty strings at the application boundary.

### 4.2 Two-row PDF header

- **FR-04**: Beneath the candidate name, the first row renders the non-empty fields in this order: location, email, phone, timezone.
- **FR-05**: The first row retains compact icons for those four contact types and separates populated items consistently. Empty values produce neither an icon nor an orphan separator.
- **FR-06**: The second row renders all non-empty professional links. Link icons are removed. The row is omitted when no links exist.
- **FR-07**: Every displayed link uses readable full-domain text without a leading protocol or `www.`. Examples: `github.com/user`, `linkedin.com/in/user`, `portfolio.dev/path`.
- **FR-08**: Every displayed link remains clickable and points to an absolute HTTP(S) destination, including legacy or imported values that were stored without a protocol.

### 4.3 Project links

- **FR-09**: A project's URL is rendered as a PDF link in both live preview and downloaded PDF.
- **FR-10**: Project link text follows the same display rule as header links: full host/path, without `http://`, `https://`, `www.`, or a link icon.
- **FR-11**: Empty or whitespace-only project links render no separator or empty link.

### 4.4 PDF section polish

- **FR-12**: The English experience section heading is `EXPERIENCE`; the Italian translation remains unchanged.
- **FR-13**: A divider appears between Languages and the custom section when both are visible even if Skills is empty.
- **FR-14**: Divider logic covers every pair of consecutive visible sections near the bottom of the CV, without double dividers or leading/trailing dividers when intermediate sections are empty.

### 4.5 Import, export, privacy, and ATS compatibility

- **FR-15**: JSON export includes phone and timezone. JSON import accepts both new exports and older exports without the fields.
- **FR-16**: AI PDF import extracts phone and timezone when present and returns empty values when absent. Both dashboard and editor import flows preserve them.
- **FR-17**: AI Optimize cannot edit personal information. Phone is masked before the CV payload is sent to the server/AI pipeline, and the privacy notice includes phone in its description. Phone is not added to the AI quick-reference snapshot.
- **FR-18**: A shared URL normalization/display boundary is used by manual input, PDF import, JSON import, contact rendering, and project rendering so stored destinations and visible labels do not diverge.
- **FR-19**: The CraftCV PDF-to-ATS regression proves that an international phone number passes D02, LinkedIn passes D03, GitHub passes D04, and location/timezone remains detectable by D08.

## 5. Non-Goals

- Automatically deriving timezone from the browser, location, or IP address.
- Automatically changing UTC offsets for daylight-saving time.
- Strict international phone validation or country-specific formatting.
- Adding phone or timezone to AI-generated content or allowing AI Optimize to edit personal details.
- Redesigning the overall CV typography, spacing system, or section order.
- Making project URLs interactive inside the editor form itself.

## 6. Design Considerations

- Keep the existing centered, ATS-oriented PDF header and typography.
- The direct-contact row is primary; the links row is secondary and may wrap independently on narrow content widths.
- Retain the existing location and email icon treatment, add equally restrained phone and timezone icons, and remove icons only from professional links as approved.
- Use text URLs as information, not decoration: no shortened usernames and no generic labels such as `GitHub` or `Portfolio`.
- Do not render empty placeholders in the PDF. “Always visible” applies to the editor inputs; PDF fields appear only when populated.

## 7. Technical Considerations

- Next.js 16, strict TypeScript, Zustand persistence, and `@react-pdf/renderer` remain unchanged.
- URL handling should be a small pure utility with focused tests. It must preserve query strings and paths while stripping only the display protocol and leading `www.`.
- Normalization must not corrupt non-HTTP schemes or malformed input. The supported user-facing contract is HTTP(S); invalid destinations remain editable and must not crash PDF generation.
- Backward compatibility must be handled explicitly because Zustand's persisted nested `personalInfo` object can predate the new fields.
- `@react-pdf/renderer` `Link` nodes are the common source for both preview and downloaded PDF, so one implementation covers both surfaces.
- The ATS route itself does not require a scoring-rule change: it already recognizes international phone numbers, full LinkedIn/GitHub URLs, and uppercase timezone abbreviations. Its export regression fixture and expectations do require updating.

## 8. Error Handling

- Empty and whitespace-only contact/link values are ignored during rendering.
- A missing phone or timezone in legacy state/imports falls back to an empty string.
- A link without a protocol receives a safe HTTPS destination for navigation while retaining its cleaned visible text.
- Import normalization must tolerate missing `personalInfo`, missing link arrays, and absent new fields without discarding otherwise valid CV data.

## 9. Testing Strategy

- Unit-test URL display and absolute-destination normalization, including protocols, `www.`, paths, query strings, whitespace, and empty input.
- Unit-test PII masking for phone and non-mutation of the original CV.
- Extend JSON import/export coverage for new and legacy contact shapes.
- Extend the CVDocument regression to assert header row content, icon-free link labels, clickable contact/project links, singular `EXPERIENCE`, and the Languages-to-Custom divider edge case.
- Refresh the real `pdf-parse` fixture and assert that D02, D03, D04, and D08 pass for a representative CraftCV export.
- Run only the focused Vitest files plus a TypeScript check if the schema change affects compile-time consumers.

## 10. Success Criteria

- A user can enter optional phone and timezone values and see them in the first PDF header row.
- All professional and project links display without protocol/icons and open the intended absolute destination.
- A CV with Languages and a custom section, but no Skills, contains exactly one divider between them.
- The English PDF heading reads `EXPERIENCE`.
- Pre-feature JSON/localStorage data loads without runtime or controlled-input warnings.
- The representative CraftCV export has passing D02, D03, D04, and D08 ATS contact checks.

## 11. Resolved Decisions

- Phone is optional free text with international-prefix guidance.
- Location/email/phone/timezone occupy the first row; all links occupy the second row.
- Only professional-link icons are removed; direct-contact icons remain.
- URLs are stored/navigated as absolute destinations but displayed without protocol or `www.`.
- Project links are clickable in PDF preview and downloaded PDF, not as an extra editor action.
- Timezone is optional manual text; it is not inferred or automatically adjusted.

