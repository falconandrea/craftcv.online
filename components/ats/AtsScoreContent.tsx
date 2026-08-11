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
      "A parser that cannot find how to contact you drops the application, however strong the experience is.",
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
      "What recruiters skim after the parser is done: does each line start with a verb and end with a number?",
    checks: ["Action verbs", "Bullet point length", "Measurable metrics"],
  },
  {
    title: "Structure",
    accent: "#ff00aa",
    description:
      "ATS software segments a CV by section heading and date. Non-standard headings and broken date ranges lose entire roles.",
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
      "The mistakes that look fine to a human and turn into garbage once the text is extracted.",
    checks: ["Special characters / emoji", "Skills parsability", "File name"],
  },
];

const FAILURE_MODES = [
  {
    problem: "Skills in a table or multi-column layout",
    consequence:
      "Text extraction reads columns in the wrong order, so skills end up glued to unrelated job titles.",
  },
  {
    problem: "Section headings like “My Journey” instead of “Experience”",
    consequence:
      "The parser has no rule for a creative heading and files the whole block as untagged text.",
  },
  {
    problem: "Icons and emoji next to contact details",
    consequence:
      "Glyphs from an icon font extract as unknown characters, which can corrupt the email or phone number next to them.",
  },
  {
    problem: "Dates written as “2022 – now” or only as years",
    consequence:
      "Duration cannot be computed, so filters on “3+ years of experience” never match you.",
  },
  {
    problem: "A file named cv_final_v3(1).pdf",
    consequence:
      "It survives parsing, but a recruiter scanning an attachment list reads it as carelessness.",
  },
];

const QUESTIONS = [
  {
    q: "Is this a real ATS or a simulation?",
    a: "A simulation. Nobody outside Workday or Taleo can run your CV through the real thing — and every company configures its own parser, keyword weights and knock-out questions. What is reproducible is the class of formatting and content problems that break parsers generally, and that is what the 16 deterministic checks measure.",
  },
  {
    q: "Why two scores?",
    a: "The lint score comes from the 16 deterministic checks: pure functions, same input, same output, every time. A passed check counts as full credit, a warning as half, and the two checks whose own advice calls them optional (GitHub, personal website) are left out of the score entirely, so a CV is never penalised for advice it can legitimately ignore. The ATS score is the AI evaluation, which reads the extracted text and judges formatting, impact and completeness the way a screener would. They answer different questions, so they are kept separate instead of averaged into one meaningless number.",
  },
  {
    q: "What does adding a job description change?",
    a: "It turns on the keyword gap report: the tool extracts the terms from the posting and reports which ones are missing from your CV. Without a job description there is nothing concrete to match against, so the keyword match score stays empty rather than being guessed.",
  },
  {
    q: "What happens to my PDF?",
    a: "The text extracted from it is sent to the AI provider for parsing and evaluation. The file itself is not stored in an account, because there are no accounts. Details are in the privacy policy — if a document is confidential, do not upload it.",
  },
  {
    q: "Does a high score mean I get the interview?",
    a: "No. It means the document is unlikely to be mangled or filtered out before a person reads it. That is a floor, not an advantage — the content still has to match the role.",
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
          Most CVs are not rejected by a person. They are parsed by software that
          turns a PDF into structured fields, and anything the parser cannot read
          is simply missing from the profile a recruiter searches. This tool runs
          your CV through the two layers that decide whether that happens.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-mono text-sm uppercase tracking-widest text-[#b8ff00] mb-2">
              1 · Deterministic rules
            </h3>
            <p className="text-sm">
              16 checks implemented as pure functions — no AI, no randomness. The
              same CV always produces the same result, and every finding names
              the rule it came from, so you can verify it yourself instead of
              trusting a score.
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-mono text-sm uppercase tracking-widest text-[#ff00aa] mb-2">
              2 · AI evaluation
            </h3>
            <p className="text-sm">
              A language model reads the extracted text and scores formatting,
              impact and completeness the way a screener would, then lists what
              to change. Paste a job description and it also reports which of the
              posting&apos;s keywords your CV is missing.
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
          Why CVs fail before a human reads them
        </h2>
        <p className="mb-6">
          The five problems below account for most silent rejections. None of
          them look like mistakes when you open the PDF yourself.
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
          Fixing these by hand in a word processor tends to reintroduce them. The{" "}
          <Link
            href="/editor"
            className="text-[#b8ff00] underline underline-offset-4 hover:no-underline"
          >
            CraftCV editor
          </Link>{" "}
          exports a single-column, parser-safe PDF, so the layout cannot drift
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
          re-run this check on the export until nothing is flagged.
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-mono">
          {/* Underline is always visible; hover only shifts the colour. The
              underline inherits currentColor, so text and rule move together. */}
          <Link
            href="/dashboard"
            className="text-white/60 underline underline-offset-4 transition-colors hover:text-[#b8ff00]"
          >
            Build an ATS-ready CV →
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
