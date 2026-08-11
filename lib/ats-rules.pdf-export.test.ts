import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { runAllChecks, extractBullets } from "./ats-rules";

/**
 * Regression suite against REAL extracted text.
 *
 * `lib/__fixtures__/craftcv-export.txt` is the verbatim output of
 * `PDFParse().getText()` on a PDF rendered by this project's own
 * `components/pdf/cv-document.tsx`. Every other rule test uses hand-authored
 * strings, which hide the thing that actually breaks these checks: how
 * pdf-parse splits lines, glues bullet glyphs to words and flattens headers.
 *
 * To refresh it: render a CV with CVDocument, run the buffer through
 * PDFParse().getText() and paste the result here unchanged.
 */
const exportedText = readFileSync(
  resolve(process.cwd(), "lib/__fixtures__/craftcv-export.txt"),
  "utf8",
);

describe("real pdf-parse output from a CraftCV export", () => {
  it("finds the section headings that survive extraction", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    const sections = result.checks.find(c => c.id === "S01")!;
    expect(sections.status).toBe("passed");
    // "EXPERIENCES" (plural, uppercase) must still count as Experience.
    expect(sections.message).toContain("Experience");
  });

  it("counts exactly the six real bullets and no metadata lines", () => {
    const bullets = extractBullets(exportedText);
    expect(bullets).toHaveLength(6);
    expect(bullets.some(b => b.includes("@"))).toBe(false);
    expect(bullets.some(b => /Present/.test(b))).toBe(false);
    expect(bullets.some(b => /^Politecnico/.test(b))).toBe(false);
  });

  it("reads the timeline without inventing a gap", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    expect(result.checks.find(c => c.id === "S03")!.status).toBe("passed");
    expect(result.checks.find(c => c.id === "S04")!.status).toBe("passed");
  });

  it("does not flag the page footer or the bullet glyph as problematic characters", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    expect(result.checks.find(c => c.id === "A01")!.status).toBe("passed");
  });

  it("returns a clean location detail, not a fragment spanning two lines", () => {
    const location = runAllChecks(exportedText).checks.find(c => c.id === "D08")!;
    expect(location.status).toBe("passed");
    expect(location.details).toBe("Milan, Italy");
  });

  it("scores the export highly, and only the missing phone costs points", () => {
    const result = runAllChecks(exportedText, "Mario_Rossi_CV_2026.pdf");
    const notPassed = result.checks.filter(c => c.status !== "passed").map(c => c.id);
    // D02: CVState has no phone field at all, so an export can never carry one.
    expect(notPassed).toEqual(["D02"]);
    expect(result.lintScore).toBeGreaterThanOrEqual(90);
  });
});
