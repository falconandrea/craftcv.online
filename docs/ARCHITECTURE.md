# ARCHITECTURE.md

## Current implementation (2026-10-07)

Editing, preview and PDF generation run in the browser. Zustand persists CV fields in localStorage without application-level encryption. Server routes handle AI Optimize, PDF import, ATS checks/review, JD keyword extraction and entry TL;DR generation. Aggregate usage counters are stored server-side in JSON files; there is no central CV database.

AI Optimize masks selected structured contact fields in the standard client flow and validates proposed patches before exposing them for application. Other AI pipelines have their own input/output checks and do not share Optimize patch grounding. See [AI_PROMPTS.md](AI_PROMPTS.md), [ATS_RULES.md](ATS_RULES.md), [README](../README.md) and the [privacy policy](https://craftcv.online/privacy).

> **Historical architecture sketch below.** The old route tree and optional server-side PDF-rendering description are not a description of the current implementation.

## High-Level Architecture

The application is fully client-driven with optional server-side PDF rendering.

```
/app
  /editor
    /sections
  /preview
  /pdf
/state
/lib
```

---

## State Management

- Single global CV store
- Schema-driven data model
- Local persistence

---

## Rendering Flow

1. User edits form sections
2. State updates live
3. Preview updates instantly
4. PDF is generated from state
