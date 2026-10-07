# ROADMAP.md

> **Historical planning document.** This records the original product plan, not the current implementation or active constraints. Claims about local-only operation, no backend APIs/storage, universal ATS compliance, icon-free PDFs and future AI rewriting are superseded. Current capabilities and processing are documented in [README](../README.md), [AI prompt contracts](AI_PROMPTS.md), [ATS rules](ATS_RULES.md) and the [privacy policy](https://craftcv.online/privacy).

## Project: ATS-Friendly CV Generator

### General Rules (Apply to All Phases)

- Follow the documentation strictly (`README.md`, `ATS_RULES.md`, `DATA_SCHEMA.md`)
- Do not introduce features not explicitly listed
- Do not add authentication, database, or backend APIs
- Prefer simple, explicit code over abstractions
- Every phase must result in a runnable application

---

## Phase 0 – Project Setup

### Goals

Prepare a clean Next.js project ready for incremental development.

### Tasks

- Initialize Next.js project (App Router)
- Install and configure:
  - Tailwind CSS
  - shadcn/ui
  - Zustand
  - @react-pdf/renderer

- Set up base folder structure:

  ```
  /app
  /state
  /lib
  /docs
  ```

### Output

- Application runs locally
- Empty homepage renders correctly

---

## Phase 1 – Data Model & State

### Goals

Create a single source of truth for all CV data.

### Tasks

- Define CV data schema based on `DATA_SCHEMA.md`
- Create a Zustand store with:
  - CV state
  - Update actions per section
  - Reset action

- Add localStorage persistence

### Output

- CV state updates correctly
- Data persists across page reloads

---

## Phase 2 – Editor UI (Forms Only)

### Goals

Allow users to input all CV data through structured forms.

### Tasks

- Create Editor page
- Build form components for each section:
  - Personal Information
  - Summary
  - Experience
  - Skills
  - Certifications
  - Side Projects
  - Education

- Experience section must support:
  - Add / remove entries
  - Reorder entries (drag & drop)

### Constraints

- No live preview yet
- No PDF generation yet

### Output

- Users can fully input and edit all CV data

---

## Phase 3 – Live Preview (HTML)

### Goals

Provide a live preview that mirrors the final PDF layout.

### Tasks

- Create Preview page
- Render CV using semantic HTML
- Enforce:
  - One-column layout
  - ATS-safe headings
  - Minimal, neutral typography

### Output

- Preview updates instantly when data changes

---

## Phase 4 – Live Preview Side-by-Side

### Goals

Integrate the live preview directly into the editor page for real-time feedback while editing.

### Tasks

- Redesign editor layout with three-column structure:
  - Left: Section navigation (tabs)
  - Center: Active form section
  - Right: Live preview panel
- Implement responsive behavior:
  - Desktop: Three-column layout with preview always visible
  - Tablet: Preview collapsible or below forms
  - Mobile: Preview in separate tab or toggle
- Ensure preview updates in real-time as user types
- Add preview visibility toggle for smaller screens
- Optimize layout for comfortable data entry

### Constraints

- Follow UI_GUIDELINES.md layout recommendations
- Maintain existing form functionality
- No changes to data model or state management
- Preview must remain ATS-compliant

### Output

- Users can see CV preview while editing
- Smooth real-time updates
- Responsive design works across devices

---

## Phase 5 – PDF Generation

### Goals

Generate an ATS-optimized PDF from the CV state.

### Tasks

- Implement `CVDocument` using `@react-pdf/renderer`
- Use standard fonts:
  - Helvetica (primary)
  - Arial (fallback)

- Implement:
  - Automatic page breaks
  - Section grouping
  - Multi-page support

### Constraints

- PDF layout must match the preview layout

### Output

- Downloadable PDF
- Clickable links
- Selectable text

---

## Phase 6 – Import / Export JSON

### Goals

Allow users to reuse and duplicate CV data easily.

### Tasks

- Implement Export JSON button
- Implement Import JSON flow
- Validate imported data structure

### Output

- Users can export CV data
- Users can import JSON to restore a CV

---

## Phase 7 – Polish & Guardrails

### Goals

Make the application robust and predictable.

### Tasks

- Prevent empty sections from rendering
- Normalize date formats
- Handle "Present" end dates consistently
- Minor UI cleanup (spacing, alignment)
- UX Improvements (Phase 7b):
  - Add drag & drop reordering to Education, Projects, and Certifications sections
  - Add drag & drop reordering to Skills section
  - Implement tag input for Skills (type and press Enter to add)
  - Add Reset All Data button to clear localStorage
  - Replace calendar picker with cascading Year/Month selects
  - Always show one input field for Links (even when empty)
  - Set "Present" checkbox as default for new experience entries

### Constraints

- No new features

### Output

- Production-ready MVP

---

## Phase 8 – Documentation Check

### Goals

Ensure long-term maintainability.

### Tasks

- Verify code matches documentation
- Add inline comments where decisions are non-obvious
- Update documentation if needed (without scope expansion)

---

## Phase 9 – Deploy Automation

### Goals

Automate the deployment process to production server using GitHub Actions and Docker.

### Tasks

- Create Dockerfile optimized for Next.js production builds
- Create GitHub Actions workflow that:
  - Triggers on push to `main` branch
  - Builds Docker image using Docker Buildx
  - Pushes image to GitHub Container Registry (GHCR)
  - Connects to production server via SSH
  - Executes deployment script

- Create `server/docker-compose.yml` for production server:
  - Configure Traefik labels for routing
  - Set up HTTPS with Let's Encrypt
  - Configure HTTP to HTTPS redirect
  - Set up DNS for `craftcv.online`
  - Use port 3001 to avoid conflicts with existing containers

- Create `server/deploy.sh` script for server-side deployment:
  - Pull latest Docker image from GHCR
  - Restart container using docker-compose
  - Handle container recreation

### GitHub Secrets Required

Configure in repository settings:

- `PRODUCTION_SERVER_HOST` - Server IP/hostname
- `PRODUCTION_SERVER_USER` - SSH username
- `PRODUCTION_SERVER_SSH_KEY` - SSH private key
- `GHCR_USERNAME` - GitHub username
- `GHCR_TOKEN` - GitHub PAT with `write:packages` scope

### GitHub Variables Required

- `NEXT_PUBLIC_API_ENDPOINT` - API endpoint (if needed)
- `NEXT_PUBLIC_ENV` - Environment identifier

### Output

- Automated CI/CD pipeline
- Application deployed at https://craftcv.online on port 3001
- HTTPS with Let's Encrypt certificates
- Zero-downtime deployments
- Deployment files organized in `server/` directory
- GitHub Actions automatically copies files to `/home/ubuntu/apps/craftcv.online`

### Constraints

- Follow DEPLOY.md documentation
- No staging environment (production only)
- No authentication/database to configure
- Single environment deployment

---

## Phase 10 – PDF Layout Enhancement

### Goals

Improve the visual design and layout of the generated PDF to match a professional, clean CV template while maintaining ATS compatibility.

### Tasks

- Redesign PDF layout with enhanced typography and spacing:
  - **Header**: Large bold name (≈24pt) with contact info aligned left below
  - **Section headings**: Bold uppercase (SUMMARY, EXPERIENCE, PROJECT, EDUCATION, SKILLS)
  - **Experience entries**:
    - Job title in bold (≈16pt)
    - Company name in italic (≈14pt)
    - Dates right-aligned in lighter gray (≈10pt)
    - Location below company
    - Bullet points for responsibilities
  - **Project entries**:
    - Project name in bold
    - Link underlined/clickable
    - Dates in lighter gray
    - Bullet points for contributions
  - **Education entry**:
    - Degree in bold
    - University in italic
    - Dates in lighter gray
  - **Skills**: Comma-separated list (no bullet points)

- Add horizontal divider lines between sections for clear visual separation
- Improve spacing:
  - 1.5x line height for body text
  - Consistent vertical spacing between sections
  - 1-inch margins on all sides

- Ensure typography hierarchy:
  - Name: largest, boldest
  - Section headings: bold, uppercase
  - Job/Project titles: bold
  - Company/University: italic
  - Dates: lighter gray, smaller
  - Body text: regular weight

### Constraints

- Maintain ATS compatibility (no images, icons, tables, multi-column grids)
- Use standard fonts only (Helvetica → Arial → sans-serif)
- Keep clickable links for email, LinkedIn, GitHub, project URLs
- Preserve existing data model and state management

### Output

- PDF with professional, clean layout matching reference design
- Improved readability and visual hierarchy
- Maintained ATS compatibility

---

## Final Notes for Agents

- Correctness > aesthetics
- ATS compatibility is the primary success metric
- Avoid creative deviations from the documentation
