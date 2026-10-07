# CraftCV: AI CV Builder with Rule-Based ATS Checks

Build and tailor CVs with AI Optimize, which compares proposed edits against existing career details. Separate rule-based ATS checks and job keyword analysis help identify concrete gaps. Built with Next.js.

> **Status**: In Active Development
> **Privacy**: Local-first. Editor data is stored in your browser. AI features and ATS analysis send content through the server to an external provider; see the privacy details below.

---

## 🚀 Features

- **ATS-Ready**: Single-column layout optimized for Applicant Tracking Systems.
- **PDF Import**: Kickstart your CV by uploading an existing PDF. AI extracts the data and fills the form for you.
- **Real-time Preview**: See changes as you type.
- **Privacy First**: CV data is stored locally in your browser, with no central CV database. Server-side processing and aggregate telemetry are documented below.
- **Export/Import**: Save your progress as a JSON file and resume anytime.
- **PDF Generation**: High-quality, selectable text PDF output.
- **Mobile Friendly**: Responsive design for editing on the go.
- **ATS CV Check**: Check extracted PDF text and the filename with 16 deterministic lint rules (contacts, bullet quality, structure) and, when AI keyword extraction is available, a keyword gap analysis against a supplied job description. The lint score is weighted — a warning is half credit and the two optional checks never lower it — and it stays separate from the AI score instead of being averaged into one number. Rules and scoring: [`docs/ATS_RULES.md`](./docs/ATS_RULES.md).
- **AI-Powered**:
  - Optimize your CV based on a Job Description (using LLMs like DeepSeek).
  - Keyword Gap Analysis against any job description.
  - AI Optimize checks proposed patches: protected experience dates and education/certification years are preserved, unsupported skills/entities are flagged, and detected new metrics are flagged; flagged proposals require diff review, with explicit metric confirmation before applying. These heuristic checks do not verify career history or catch every unsupported claim.
  - Token-optimized career data model (TL;DR fields, skill evidence linking) to reduce prompt context size where compact context is appropriate.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **PDF Engine**: [@react-pdf/renderer](https://react-pdf.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/falconandrea/craftcv.online.git
   cd craftcv.online
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env.local` and fill in your AI provider details:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## AI provider configuration

CraftCV supports OpenAI-compatible endpoints such as DeepSeek, OpenAI and Ollama.
Only AI Optimize can additionally use Claude through Anthropic's native Messages API.
The deployment chooses the provider; visitors cannot select it at runtime.

```env
# Optimize only (unset means openai_compatible for backward compatibility)
AI_OPTIMIZE_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-key
ANTHROPIC_MODEL=claude-sonnet-5-5

# Other AI features; also Optimize when openai_compatible is selected
AI_PROVIDER_BASE_URL=https://api.deepseek.com/v1
AI_PROVIDER_API_KEY=your-deepseek-key
AI_PROVIDER_MODEL=deepseek-chat
```

Both Anthropic variables are required when selected. Unknown selectors or missing
selected-provider configuration return 503; there is no automatic provider fallback.
PDF import, ATS AI review, JD extraction and TL;DR generation still use `AI_PROVIDER_*`.
Keys stay server-side: never use `NEXT_PUBLIC_` for these variables. Set them in
`.env.local` for local development or the server's `server/.env` for the Compose
reference deployment, then restart/recreate the service. The image is unchanged by
runtime provider selection, but the new SDK requires deploying the updated image.

Anthropic sampling and thinking parameters are omitted, leaving the model's default
adaptive thinking. Only text blocks enter the application. Incomplete or refused
responses cannot produce applicable patches. Token counters retain their existing
input/output meaning; output usage can include reasoning tokens, so provider totals
are not a direct comparison of visible text. No prompt caching is enabled here.

Manual paid smoke test: follow [AI Optimize providers](docs/AI_PROVIDERS.md).
The command is explicit and never runs in normal tests or CI.

---

## 🐳 Docker

The project includes a multi-stage `Dockerfile` for production-ready builds.

### Run locally with Docker

```bash
# 1. Build the image
docker build -t cv-generator .

# 2. Run the container
docker run -p 3000:3000 cv-generator
```

Then open [http://localhost:3000](http://localhost:3000).

### Deploy on a VPS (with Traefik)

The `server/docker-compose.yml` file is provided as a reference for self-hosting on a VPS behind a [Traefik](https://traefik.io/) reverse proxy with automatic HTTPS (Let's Encrypt).

> **Note**: The file is pre-configured for the domain `craftcv.online` and pulls the image from GHCR (`ghcr.io/falconandrea/craftcv.online:main`). You'll need to edit it to match your own domain and image registry before using it.

**Persistent Telemetry/Stats**:
Our docker setup expects a local `./data` volume bind to persist JSON-based telemetry without a database. Use the included `server/deploy.sh` script or manually create it before starting:
```bash
mkdir -p data && chmod 777 data
docker compose up -d
```

---

## AI-assisted, spec-driven development

Development uses explicit specifications, focused implementation, tests and review. AI assists with implementation; documented constraints and code-level validation help check its output.

## Privacy and processing

- Editor CV data is persisted in browser local storage; JSON export provides a portable backup. There is no central database of user CVs.
- AI features and ATS analysis send content through the server to the configured external AI provider. AI Optimize masks structured name, email, phone and profile-link fields; free-text CV content and chat messages may still contain identifiers.
- PDF import and ATS analysis send extracted PDF text without PII masking. TL;DR generation sends the selected entry title, role, description and language without masking. Grounding checks described above apply to AI Optimize, not every AI feature.
- The site uses Google Analytics via GTM, Microsoft Clarity for session recording and CookieYes for consent management. Aggregate usage/token counters are persisted server-side in JSON files.
- See the [privacy policy](https://craftcv.online/privacy) for processing details.

---

## 📝 License

MIT
