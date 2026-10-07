import Link from "next/link";

/**
 * Static, server-rendered copy for /ats-score.
 *
 * The page used to be a bare upload widget with ~80 words of indexable text,
 * which is not enough for a search engine to understand what it does. Every
 * claim here is checked against lib/ats-rules.ts and
 * app/api/ai/analyze-ats/route.ts — do not add capabilities the code does not
 * have. Keep the check names in sync with ALL_CHECKS.
 */

const CHECK_GROUPS = [
  {
    title: "Contact details",
    accent: "#00ffd5",
    description:
      "Checks whether recognizable contact details appear in the extracted text.",
    checks: [
      "Email address",
      "Phone number",
      "LinkedIn URL",
      "GitHub URL",
      "Personal website / portfolio",
      "Location / timezone",
    ],
  },
  {
    title: "Bullet quality",
    accent: "#b8ff00",
    description:
      "Checks action-verb openings, bullet length and the presence of measurable results. Include numbers only when they are accurate.",
    checks: ["Action verbs", "Bullet point length", "Measurable metrics"],
  },
  {
    title: "Structure",
    accent: "#ff00aa",
    description:
      "Checks recognizable sections and date patterns, and flags possible timeline issues for review.",
    checks: [
      "Standard sections",
      "Dates & timeline",
      "Employment gaps",
      "Recent roles without end date",
    ],
  },
  {
    title: "ATS-specific parsing",
    accent: "#00f0ff",
    description:
      "Checks special characters, skills formatting and the filename for potential parsing issues.",
    checks: ["Special characters / emoji", "Skills parsability", "File name"],
  },
];

const FAILURE_MODES = [
  {
    problem: "Skills in a table or multi-column layout",
    consequence:
      "Columns and tables can disrupt reading order during PDF text extraction.",
  },
  {
    problem: "Section headings like “My Journey” instead of “Experience”",
    consequence:
      "Creative headings may be harder for automated section detection to recognize.",
  },
  {
    problem: "Icons and emoji next to contact details",
    consequence:
      "Some icon glyphs extract as unknown characters. Check that adjacent contact details remain readable.",
  },
  {
    problem: "Dates written as “2022 – now” or only as years",
    consequence:
      "Ambiguous date formats can make timeline interpretation less reliable. Review flagged date ranges.",
  },
  {
    problem: "A file named cv_final_v3(1).pdf",
    consequence:
      "Generic names and draft markers trigger the filename check. Use a clear name for your exported CV.",
  },
];

const QUESTIONS = [
  {
    q: "Does this reproduce an enterprise ATS?",
    a: "A CV checking tool, not an enterprise ATS. It checks extracted PDF text and the filename using documented rules, with a separate AI review when available. It does not reproduce proprietary ATS products or employer configurations.",
  },
  {
    q: "Why two scores?",
    a: "The weighted lint score is calculated by code from 16 deterministic checks. A passed check earns full credit, a warning half; optional GitHub and personal-website checks do not lower it. A separate AI evaluation score summarizes model feedback on the extracted text. The scores are not averaged. If AI review fails or is not configured, the rule-based report is still available.",
  },
  {
    q: "What does adding a job description change?",
    a: "When AI keyword extraction is available, it extracts terms from the posting and code checks for them in your CV text. The keyword gap score measures matched terms marked must-have by the extraction; it is not evidence that you have or lack a skill. Without must-have terms, this gap score is N/A. The AI review may also comment on keyword coverage.",
  },
  {
    q: "What happens to my PDF?",
    a: "The server extracts text from your PDF. The rules check the full extracted text and filename; up to 15,000 characters of unmasked CV text may be sent to the configured AI provider for review. The original PDF is not sent to the provider. See the privacy policy for processing and retention details.",
  },
  {
    q: "Does a high score mean I get the interview?",
    a: "No. A high lint score means your CV passed more of these documented checks; a high AI score reflects the model’s assessment. Neither predicts acceptance by an employer’s ATS or a job interview.",
  },
];

export function AtsScoreContent() {
  return (
    <section className="w-full max-w-3xl mt-20 space-y-16 text-white/70 leading-relaxed">
      {/* How it works */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mb-4">
          How the ATS check works
        </h2>
        <p className="mb-4">
          Start with reproducible checks on the text extracted from your PDF and its filename. A separate AI review adds feedback when available; it does not determine the rule-based lint score.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-mono text-sm uppercase tracking-widest text-[#b8ff00] mb-2">
              1 · Deterministic rules
            </h3>
            <p className="text-sm">
              16 checks implemented as pure functions — no AI, no randomness. The
              same extracted text and filename produce the same findings for a given date (an open-ended role marked
              &ldquo;Present&rdquo; is measured against today&apos;s date), and every finding
              names the rule it came from, so you can verify it yourself instead
              of trusting a score.
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-mono text-sm uppercase tracking-widest text-[#ff00aa] mb-2">
              2 · AI evaluation
            </h3>
            <p className="text-sm">
              A language model reads the extracted text and scores formatting,
              impact and completeness, then suggests what to review. With a job description, AI extracts keywords and code matches them against your CV for a separate keyword gap report. Both AI-dependent layers are best-effort; the deterministic checks still work when they are unavailable.
            </p>
          </div>
        </div>
      </div>

      {/* The checks */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mb-4">
          The 16 deterministic checks
        </h2>
        <p className="mb-6">
          These run before any AI is involved. They are grouped by what fails
          when the check fails.
        </p>
        <div className="space-y-6">
          {CHECK_GROUPS.map((group) => (
            <div
              key={group.title}
              className="border-l-2 pl-5"
              style={{ borderColor: group.accent }}
            >
              <h3 className="font-mono text-base font-bold text-white mb-1">
                {group.title}
              </h3>
              <p className="text-sm mb-3">{group.description}</p>
              <ul className="flex flex-wrap gap-2">
                {group.checks.map((check) => (
                  <li
                    key={check}
                    className="text-xs font-mono px-2 py-1 border border-white/10 bg-white/[0.03] text-white/60"
                  >
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Failure modes */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mb-4">
          Common PDF and content issues to review
        </h2>
        <p className="mb-6">
          These examples show why checking extracted text and clear formatting can be useful. They are possible issues, not predictions of rejection by a particular ATS.
        </p>
        <dl className="space-y-4">
          {FAILURE_MODES.map((item) => (
            <div key={item.problem} className="border border-white/10 p-4">
              <dt className="font-mono text-sm text-[#00ffd5] mb-1">
                {item.problem}
              </dt>
              <dd className="text-sm">{item.consequence}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm">
          The{" "}
          <Link
            href="/editor"
            className="text-white/60 underline underline-offset-4 transition-colors hover:text-[#b8ff00]"
          >
            CraftCV editor
          </Link>{" "}
          exports a single-column PDF with selectable text, so the layout cannot drift
          back into a table.
        </p>
      </div>

      {/* Questions. Deliberately plain markup: Google has restricted FAQPage
          rich results to a narrow set of sites, so there is no schema to chase
          here — the content is for readers and topical coverage. */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mb-6">
          Questions people actually ask
        </h2>
        <div className="space-y-6">
          {QUESTIONS.map((item) => (
            <div key={item.q}>
              <h3 className="font-mono text-base font-bold text-white mb-2">
                {item.q}
              </h3>
              <p className="text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next step */}
      <div className="border border-[#b8ff00]/30 bg-[#b8ff00]/[0.04] p-6">
        <h2 className="text-xl font-bold font-mono tracking-tight text-white mb-2">
          After the report
        </h2>
        <p className="text-sm mb-4">
          The report tells you what to change; fixing it is a separate job. You
          can rebuild the CV from scratch in the editor, keep the file local, and
          re-run this check on the export and review any findings that matter to your CV.
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-mono">
          {/* Underline is always visible; hover only shifts the colour. The
              underline inherits currentColor, so text and rule move together. */}
          <Link
            href="/dashboard"
            className="text-white/60 underline underline-offset-4 transition-colors hover:text-[#b8ff00]"
          >
            Build my CV →
          </Link>
          <Link
            href="/"
            className="text-white/60 underline underline-offset-4 transition-colors hover:text-[#b8ff00]"
          >
            What CraftCV does
          </Link>
          <Link
            href="/privacy"
            className="text-white/60 underline underline-offset-4 transition-colors hover:text-[#b8ff00]"
          >
            How your data is handled
          </Link>
        </div>
      </div>
    </section>
  );
}
