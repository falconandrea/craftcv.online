# PROJECT.md

> **Historical planning document.** This records the original product plan, not the current implementation or active constraints. Claims about local-only operation, no backend APIs/storage, universal ATS compliance, icon-free PDFs and future AI rewriting are superseded. Current capabilities and processing are documented in [README](../README.md), [AI prompt contracts](AI_PROMPTS.md), [ATS rules](ATS_RULES.md) and the [privacy policy](https://craftcv.online/privacy).

## Project info

### Goal

Build a web application that allows users to generate **ATS-optimized CVs** by filling structured sections and exporting a clean, professional PDF.

The application is designed for:

- No authentication
- No database
- Local-only state
- Maximum ATS compatibility

---

## Key Principles (Non-Negotiable)

These rules **must never be violated**, as they directly impact ATS parsing:

- One-column layout only
- Text-only PDF (no images, icons, charts)
- No tables
- No multi-column grids
- Standard fonts only (Helvetica → Arial → sans-serif)
- Clear section headings
- Bullet points using simple hyphens
- Clickable text links (mailto / https)

---

## Sections

### Personal Information

- Full name
- Location
- Email
- Links (GitHub, LinkedIn, personal site, etc.)

### Summary

- Free text professional summary

### Experience (Sortable)

Each experience entry contains:

- Company name
- Role
- Start date
- End date (nullable → displayed as "Present")
- Location (optional)
- Description (free text, bullet-friendly)

Entries must be reorderable manually.

### Skills

- Flat list of skills
- Rendered as comma-separated text

### Certifications

- Title
- Issuer
- Year (optional)

### Side Projects

- Project name
- Role
- Link
- Description

### Education

- Degree
- Institution
- Location
- Year

---

## PDF Output Rules

- Single-page or multi-page PDF is decided automatically based on content length
- Section titles must never break across pages
- Experience entries should not split awkwardly
- Font size and spacing must favor readability and ATS parsing

---

## Data Handling

- All data is stored in client-side state
- Persisted via localStorage
- No backend storage

### Import / Export

Users can:

- Export CV data as JSON
- Import JSON to restore or duplicate a CV

---

## Tech Stack

- Next.js (App Router)
- Tailwind CSS
- shadcn/ui
- Zustand (state management)
- @react-pdf/renderer (PDF generation)

---

## Extensibility

Future extensions may include:

- AI-assisted text rewriting
- Multiple templates
- Language switching
