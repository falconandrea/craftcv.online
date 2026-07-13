# Research: agentkit-seo → CraftCV Idea Export

> **Source**: [agentkit-seo/agentkit-seo](https://github.com/agentkit-seo/agentkit-seo) (MIT)
> **Source type**: Portable AI agent **skills / Markdown playbooks** (no software). It instructs AI agents on evidence-based career optimization across CV/ATS, LinkedIn, GitHub, portfolios, X.
> **Purpose of this doc**: Capture every useful idea from agentkit-seo, map it to CraftCV's real codebase, prioritize it, and link to the individual feature PRDs.
> **Status**: Spec backlog — ideas captured for future implementation. No code written yet.
> **Created**: 2026-07-03

---

## What agentkit-seo actually is

It is **not** a library you install via code. It is a set of human-readable playbooks that guide AI agents. There is nothing to import — only **methodology and patterns** to adopt. Three core philosophies underpin everything:

1. **Evidence-based optimization** — separate *verified facts* from *stated goals*; never let an AI invent claims or inflate metrics it cannot source.
2. **One source of truth** — a single structured "career context" file that grounds every output (CV, LinkedIn, GitHub), instead of re-explaining context each session.
3. **Platform-specific rules** — deterministic formatting/keyword constraints per surface, layered on top of the factual content.

---

## Cross-cutting principle (applies to all clusters)

> **Determinism before AI.** Where a rule can be checked with code, do not ask an LLM. LLMs handle the subjective residue (impact wording, semantic keyword matching, rewriting). This makes scores reproducible, explainable, and cheaper to run.

---

## Complete idea map

### 🟦 Cluster A — ATS Score deterministic rules engine
**Improvement to existing feature** — `/ats-score` (currently 100% AI-judged).

| ID | Idea | Source | Type |
|----|------|--------|------|
| A1 | Lint section header naming (`Experience`/`Education`/`Skills` yes; "Professional Journey" no) | cv-ats/core-sections | Deterministic |
| A2 | Single-column, no tables/text-boxes/graphics/icons, URLs explicit (not anchor-masked) | cv-ats/common-pitfalls + formatting-rules | Deterministic |
| A3 | System fonts ≥10pt, single date format, reverse-chronological order | cv-ats/formatting-rules + core-sections | Deterministic |
| A4 | **Copy-paste text extraction test**: extract text from generated PDF, verify logical top-to-bottom order | cv-ats/common-pitfalls (Copy-Paste-Friendly test) | ⭐ Deterministic — huge, because CraftCV generates its own PDFs |
| A5 | Weak-bullet detector: passive voice ("Responsible for", "Tasked with", "Worked on"), bullets without metrics | cv-ats/achievement-metrics anti-patterns | Deterministic |
| A6 | Validate STAR/XYZ structure (Action Verb + Task + Result) | cv-ats/achievement-metrics | Deterministic |

**PRD**: [`../ats-score-deterministic/prd-ats-score-deterministic.md`](../ats-score-deterministic/prd-ats-score-deterministic.md)

---

### 🟩 Cluster B — JD Tailoring & Keyword Gap Analysis
**New capability** — biggest gap vs competitors (Teal/JobScan).

| ID | Idea | Source | Type |
|----|------|--------|------|
| B1 | Extract hard skills vs soft skills from JD | cv-ats/keyword-strategy | AI |
| B2 | **Gap analysis**: JD keywords present vs missing in CV | cv-ats/keyword-strategy | ⭐ AI + UI (the "wow") |
| B3 | Mirror exact JD phrasing for hard skills | cv-ats/keyword-strategy | AI |
| B4 | Acronym defense (both forms: "SEO" + "Search Engine Optimization") | cv-ats/keyword-strategy | AI |
| B5 | Skill translation for career switchers (map transferable skills to target vocabulary) | cv-ats/keyword-strategy | AI |
| B6 | Propose bullet rewrites that contextualize keywords (no stuffing) | cv-ats/keyword-strategy | AI → patch |

**Placement decision (approved)**: **B-3 split** — diagnosis lives in the `/ats-score` tool (paste JD → gap report), cure lives in **AI Optimize** (gap report offers "Fix in editor" → routes to editor with JD pre-loaded, AI proposes targeted patches).

**PRD**: [`../jd-tailoring/prd-jd-tailoring.md`](../jd-tailoring/prd-jd-tailoring.md)

---

### 🟨 Cluster C — AI Optimize grounding & anti-hallucination
**Enhancement to existing feature** — `ai-optimize`. Directly addresses the "False Positive Changes" bug already documented in `lessons.md`.

| ID | Idea | Source | Type |
|----|------|--------|------|
| C1 | **Anti-invention guardrail**: AI cannot add skills/tools/roles absent from the CV JSON | context-file-spec (skills need body evidence) | Validation (post-LLM) |
| C2 | **VERIFIED FACTS extraction**: pull all numbers (grades, %, dates, IDs) and block AI from altering them | context-file-spec `<!-- VERIFIED FACTS -->` | Pipeline |
| C3 | **"Needs verification" flag**: when AI proposes an unverifiable metric, flag it instead of inventing | agent-context "evidence boundaries" | UI badge |
| C4 | Enforce STAR/XYZ formula in bullet rewrites | cv-ats/achievement-metrics | System prompt |

**PRD**: [`../ai-grounding/prd-ai-grounding.md`](../ai-grounding/prd-ai-grounding.md)

---

### 🟪 Cluster D — Structured career data model
**Data model enhancement** — patterns from the agentkit-seo context-file spec applied to CraftCV's CV JSON.

| ID | Idea | Source | Type |
|----|------|--------|------|
| D1 | **TL;DR field** on each experience/project (≤30 words) — helps AI + recruiter scanning | context-file-spec (TL;DR convention) | Schema + UI |
| D2 | **Quick reference snapshot**: flat token-efficient view of the CV passed to AI prompts instead of full JSON | context-file-spec (QUICK REFERENCE block) | Utility |
| D3 | **Skill evidence linking**: each skill should point to where it is proven (project/role) | context-file-spec (skills need body evidence) | Schema + UI |

**PRD**: [`../career-data-model/prd-career-data-model.md`](../career-data-model/prd-career-data-model.md)

---

### ⬜ Cluster E — Out of scope (noted for future)
Multi-platform export: LinkedIn About/Headline generator, GitHub profile/README generator, X bio. This is a **scope expansion** (CV builder → career presence builder). Noted here so it is not lost, but **no PRD written** in this pass.

---

## Prioritization & suggested order

| Priority | Cluster | Why |
|----------|---------|-----|
| 🔴 P0 | **A** (ATS deterministic) | Highest leverage. Guarantees CraftCV's own PDF output is ATS-safe; makes the flagship `/ats-score` tool reproducible and explainable; reduces AI cost. Low risk, mostly deterministic code. |
| 🔴 P0 | **B** (JD Tailoring) | Biggest competitive gap. Highest user-perceived value (gap analysis is the "wow"). Feeds conversion (B-3: diagnosis → cure in editor). |
| 🟠 P1 | **C** (AI Grounding) | Quality/safety net for AI Optimize. Prevents the fact-drift bug class already seen in `lessons.md`. Should ship with or right after B (B's patches must be grounded). |
| 🟡 P2 | **D** (Data model) | Enabler that improves A/B/C reliability but not user-visible on its own. Best done as a refactor alongside A/B/C implementation, not standalone. |

**Dependency note**: D2 (quick reference snapshot) directly improves C1 (anti-invention validation) and B's keyword engine. If implementing B and C, consider extracting D2 first as a shared utility.

---

## Source attribution & license
- **Library**: agentkit-seo — https://github.com/agentkit-seo/agentkit-seo
- **License**: MIT
- **Authors**: Renato Mignone, Elia Innocenti
- **What we adopted**: methodology and patterns only (ideas). No code, no assets copied.
- **Playbooks referenced**: `cv-ats` (core-sections, formatting-rules, common-pitfalls, keyword-strategy, achievement-metrics, agent-workflow, sources), `agent-context-optimization` (context-file-spec, agent-workflow, file-maintenance).

---

## How to use this backlog
1. Pick a cluster (suggested order above).
2. Open its PRD, review, and refine open questions.
3. Generate `tasks-*.md` for that PRD when ready to implement (use `.ai/prompts/generate_tasks.md`).
4. Implement following the standard feature workflow (`/.agents/workflows/feature.md`).
5. Mark each cluster done here as it ships.
