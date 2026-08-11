# Tasks: Stats Counters

Based on: prd-stats-counters.md

## Relevant Files

- `docker-compose.yml` - Needs volume mapping for persistent data storage.
- `deploy.sh` - Needs `mkdir -p data` and `chmod 777 data` to ensure Node.js can write without permission errors in the container.
- `lib/stats.ts` - New utility to manage atomic reads and writes of the JSON counter file via `fs.promises`.
- `app/api/ai/optimize/route.ts` - Server-side hook for `ai_messages` increments.
- `app/api/ai/analyze-ats/route.ts` - Server-side hook for `ats_tests` increments.
- `app/api/ai/import-pdf/route.ts` - Server-side hook for `pdf_uploaded` increments.
- `app/api/stats/increment/route.ts` - New API route logic to accept client-side increment tracking triggers.
- Frontend download component (e.g. `components/preview/live-pdf-preview.tsx` or equivalent) - Where `fetch` tracking is triggered.

## Instructions

**IMPORTANT:** As you complete each task, mark it by changing `- [ ]` to `- [x]`.
Update after completing each sub-task, not just parent tasks.

## Tasks

- [x] 1.0 Server and Docker Configuration
  - [x] 1.1 Add bind volume `volumes: - ./data:/app/data` to `docker-compose.yml`.
  - [x] 1.2 Add `mkdir -p data && chmod 777 data` in `deploy.sh`.
- [x] 2.0 Backend Utility Implementation
  - [x] 2.1 Create `lib/stats.ts` file.
  - [x] 2.2 Write `incrementCounter(metric: string)` function with error handling and defaults.
- [x] 3.0 Update Existing AI Endpoints
  - [x] 3.1 Add `incrementCounter("ai_messages")` in `app/api/ai/optimize/route.ts`.
  - [x] 3.2 Add `incrementCounter("ats_tests")` in `app/api/ai/analyze-ats/route.ts`.
  - [x] 3.3 Add `incrementCounter("pdf_uploaded")` in `app/api/ai/import-pdf/route.ts`.
- [x] 4.0 Create Background Frontend Route
  - [x] 4.1 Create `app/api/stats/increment/route.ts` (POST) accepting JSON like `{ metric: 'cv_created' }`.
  - [x] 4.2 Return HTTP 200/204 without waiting i.e. "fire and forget".
- [x] 5.0 Update Frontend Components
  - [x] 5.1 Identify the button/handler that generates or downloads the final PDF.
  - [x] 5.2 Introduce silent background `fetch("/api/stats/increment")` function.
- [x] 6.0 Local Testing and Verification
  - [x] 6.1 Start the container or next dev local app.
  - [x] 6.2 Click PDF download.
  - [x] 6.3 Verify the `data/stats.json` file is incremented.
