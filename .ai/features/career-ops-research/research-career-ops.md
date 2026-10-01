# Career-Ops Assessment for CraftCV

**Mode: assessment**

**Reviewed:** 2026-09-24

## Summary

Career-Ops is an open-source, local job-search workflow that runs through AI coding CLIs and Node scripts. It includes CV tailoring, job-fit analysis, application artifacts and tracking; it is not a reusable React/Next.js component library. Its most relevant idea for CraftCV is to explain each job requirement against concrete CV evidence, rather than report keyword presence alone. CraftCV already has keyword gap analysis and server-side AI grounding, so a selective adaptation of that workflow fits better than adopting Career-Ops wholesale.

## Upstream facts

- Career-Ops describes its product as a local AI job-search tool. Its architecture places most logic in Markdown prompts and standalone Node scripts, with a separate optional Go dashboard. The package manifest lists Playwright and configuration utilities, but no application framework or importable UI API. ([Architecture](https://github.com/career-ops-hq/career-ops/blob/main/ARCHITECTURE.md#L195-L246), [package.json](https://raw.githubusercontent.com/career-ops-hq/career-ops/main/package.json))
- Its job-fit report includes a requirement-to-evidence table: each requirement is assigned an importance band and evidence tier, matched as strong/partial/missing, and supported with a JD signal and a CV quote. The report caps speculative importance so inferred requirements cannot become critical blockers. ([`modes/oferta.md`](https://github.com/career-ops-hq/career-ops/blob/main/modes/oferta.md#L79-L145))
- The standalone `jd-skill-gap.mjs` extracts technical skills from requirement sections without an LLM, then classifies them as `existing`, `supportedByResume`, or `gap`. It deliberately reports when extraction did not run or found no candidates, instead of implying that an empty result means no gaps. ([`jd-skill-gap.mjs`](https://github.com/career-ops-hq/career-ops/blob/main/jd-skill-gap.mjs#L2-L19), [extraction and classification](https://github.com/career-ops-hq/career-ops/blob/main/jd-skill-gap.mjs#L273-L427))
- The project keeps application-specific artifacts together: source CV, tailored versions, the JD, a change note and a reuse decision. ([`application-artifacts.mjs`](https://github.com/career-ops-hq/career-ops/blob/main/application-artifacts.mjs#L3-L16), [artifact paths and reuse decision](https://github.com/career-ops-hq/career-ops/blob/main/application-artifacts.mjs#L26-L95))
- Career-Ops has a factual-claim checker that returns `pass`, `warn` or `block` for unsupported metrics and other claims. The README still says its no-fabrication rule lives only in prompts, so that description is out of sync with the current checker source. ([fact checker](https://github.com/career-ops-hq/career-ops/blob/main/verify-cv-facts.mjs#L791-L846), [README statement](https://github.com/career-ops-hq/career-ops/blob/main/README.md#L318-L323))
- The repository uses the MIT license. Reusing code requires preserving the copyright and license notice. ([LICENSE](https://github.com/career-ops-hq/career-ops/blob/main/LICENSE))

## Local evidence

- CraftCV's `/ats-score` flow already extracts JD keywords and computes a deterministic gap report. The current report shows present/missing hard skills and exact text context; matching is literal, and its CTA opens the editor but asks the user to paste the JD again. ([`lib/jd-analyze.ts`](../../../lib/jd-analyze.ts), [`GapReport.tsx`](../../../components/ats/GapReport.tsx), [`jd-tailoring` PRD](../jd-tailoring/prd-jd-tailoring.md))
- CraftCV already connects skills to experience, projects, education and certifications, and has a typed quick-reference CV snapshot. This gives a native source of evidence for a richer job-fit view. ([`skill-evidence.ts`](../../../lib/cv/skill-evidence.ts), [`quick-reference.ts`](../../../lib/cv/quick-reference.ts))
- AI Optimize already runs post-LLM patch validation for factual protection and anti-invention. Career-Ops' fact checker may still be a useful reference for a final export-stage audit, but the general grounding pattern is already present in CraftCV. ([`validate-patch.ts`](../../../lib/ai/grounding/validate-patch.ts), [`optimize` route](../../../app/api/ai/optimize/route.ts))
- The project has no database, and its JD-tailoring PRD lists cover-letter generation as a separate future feature. ([Tech Stack](../../../.ai/context/TECH_STACK.md), [`jd-tailoring` PRD](../jd-tailoring/prd-jd-tailoring.md))

## Assessment

| Candidate | Value for CraftCV | Fit and cost |
|---|---|---|
| Requirement-to-evidence report | High | Add importance and confidence labels to each JD requirement, show the supporting CV passage, and distinguish a named skill from evidence in experience from a genuine gap. This complements the existing keyword score instead of duplicating it. |
| Carry JD context into AI Optimize | High, low-to-medium effort | The current CTA loses the pasted JD and gaps, so users must paste the JD again. Passing a compact, validated context payload would make the existing diagnose-to-edit flow smoother. Keep the existing patch approval and grounding checks. |
| Application-specific CV versions | Medium | Preserve the original CV, tailored version, diff and JD together so a user can revisit a role or decide whether to reuse a prior CV. This fits the local-first direction, but requires a version/history model beyond the current single active CV. |
| Cover-letter workflow | Medium | A future adjacent feature could ask about motivation, problem, approach and tone, select achievements already in the CV, show a text preview, then generate a PDF only after approval. CraftCV's PRD currently leaves this out of scope. ([Career-Ops cover-letter flow](https://github.com/career-ops-hq/career-ops/blob/main/modes/cover.md#L111-L222)) |
| Portal scanner and application tracker | Low for the current product | This expands CraftCV into job discovery and pipeline management, adding provider maintenance and a larger data model. It is a separate product direction, not a focused CV enhancement. ([Career-Ops architecture](https://github.com/career-ops-hq/career-ops/blob/main/ARCHITECTURE.md#L237-L263)) |

The PDF template and generation code are also not a close fit: Career-Ops uses HTML rendered through Playwright, while CraftCV generates PDFs with `@react-pdf/renderer`. Porting its layout would mean adopting a different rendering path, and CraftCV already has deterministic ATS checks of its own. ([Career-Ops PDF flow](https://github.com/career-ops-hq/career-ops/blob/main/modes/pdf.md#L58-L74), [CraftCV stack](../../../.ai/context/TECH_STACK.md), [`ats-rules.ts`](../../../lib/ats-rules.ts))

## Alternatives and verdict

- **Adopt the whole project:** poor fit. It is a CLI-centered job-search application with file-based workflows, scripts and optional tracking UI, rather than a component or service that plugs into CraftCV.
- **Copy its scripts directly:** possible under MIT terms, but the scripts depend on Career-Ops' Markdown CV format, file layout and CLI workflow. CraftCV's typed CV model, Next.js routes and Zustand state call for an adaptation instead.
- **Selectively import the product patterns:** best fit. Start with requirement-level evidence and passing the JD/gap context through the existing editor flow. Consider per-job CV versions and a guided cover letter only if users want application management beyond CV creation.

**Verdict: selectively import.** Revisit the larger application-history and job-tracking ideas if users repeatedly ask to manage several tailored CVs or applications in CraftCV.
