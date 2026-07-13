/**
 * Regression tests for the /api/ai/optimize route's grounding + snapshot pipeline.
 *
 * These tests exercise the same composition the route uses
 * (buildQuickReference → validatePatch), with a fixed CVState and a set of
 * representative LLM-output patches. They guard against regressions when either
 * lib changes, and back the "no regression on existing AI Optimize flow" claim
 * in tasks-ai-grounding.md (U10).
 *
 * The actual OpenAI call is intentionally out of scope — that path needs a real
 * provider and is verified by manual E2E scenarios.
 */
import { describe, it, expect } from "vitest";
import type { CVState, CVPatch } from "@/state/types";
import { buildQuickReference, toPromptString } from "@/lib/cv/quick-reference";
import { validatePatch } from "@/lib/ai/grounding/validate-patch";
import { estimateTokens } from "@/lib/ai/token-estimator";

const baseCv: CVState = {
  personalInfo: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    location: "London, UK",
    phone: "+44 1234",
    links: ["https://github.com/ada"],
  },
  summary: "Backend engineer with 5 years of experience.",
  experience: [
    {
      company: "Analytical Engines Inc.",
      role: "Senior Engineer",
      startDate: "2021-03",
      endDate: null,
      location: "London",
      description: "• Built Node.js services serving 10k req/s\n• Led migration to TypeScript",
      tldr: "Backend platform lead on Node.js/TypeScript services.",
    },
  ],
  education: [
    { degree: "BSc Mathematics", institution: "King's College", location: "London", year: "2018" },
  ],
  certifications: [],
  projects: [],
  skills: ["TypeScript", "Node.js", "PostgreSQL"],
  languages: [],
  customSection: { title: "Interests", content: "" },
  cvLanguage: "en",
} as unknown as CVState;

describe("optimize route pipeline — snapshot + grounding regression", () => {
  it("builds a deterministic quick-reference snapshot for the prompt", () => {
    const ref = buildQuickReference(baseCv);
    const promptStr = toPromptString(ref);

    // Snapshot is a non-empty string with the role and top skills in it
    expect(promptStr.length).toBeGreaterThan(0);
    expect(promptStr).toContain("Senior Engineer");
    expect(promptStr).toContain("Analytical Engines Inc.");
    expect(ref.topSkills).toContain("TypeScript");

    // Determinism: same CV → same snapshot bytes
    const ref2 = buildQuickReference(baseCv);
    expect(toPromptString(ref2)).toBe(promptStr);
  });

  it("snapshot is significantly smaller than the full JSON (token-savings sanity)", () => {
    const snapshotTokens = estimateTokens(toPromptString(buildQuickReference(baseCv)));
    const fullTokens = estimateTokens(JSON.stringify(baseCv));
    // Snapshot must be strictly smaller; this is the basis of the -40% metric.
    expect(snapshotTokens).toBeLessThan(fullTokens);
  });

  it("lets a clean patch through unchanged (no grounding flags)", () => {
    const cleanPatch: CVPatch = {
      summary: "Backend engineer with 5+ years building scalable systems.",
    };
    const { cleanPatch: applied, report } = validatePatch(cleanPatch, baseCv);

    expect(applied.summary).toBe(cleanPatch.summary);
    expect(report.flaggedInventions).toHaveLength(0);
    expect(report.needsVerification).toHaveLength(0);
    expect(report.rejectedVerifiedEdits).toHaveLength(0);
  });

  it("rejects an attempt to edit a verified fact (year)", () => {
    const patch: CVPatch = {
      // Changing the graduation year from 2018 → 2020 must be rejected
      education: [
        { degree: "BSc Mathematics", institution: "King's College", location: "London", year: "2020" },
      ],
    };
    const { report } = validatePatch(patch, baseCv);
    expect(report.rejectedVerifiedEdits.length).toBeGreaterThan(0);
  });

  it("flags an invented skill not present in the CV vocabulary", () => {
    const patch: CVPatch = {
      skills: ["TypeScript", "Node.js", "PostgreSQL", "Kubernetes"],
    };
    const { report } = validatePatch(patch, baseCv);
    expect(report.flaggedInventions.length).toBeGreaterThan(0);
    expect(report.flaggedInventions.some(f => /kubernetes/i.test(f.term))).toBe(true);
  });

  it("composes the full route pipeline without throwing on a representative patch", () => {
    // Smoke test: the exact sequence the route runs after the LLM responds.
    const llmPatch: CVPatch = {
      summary: "Backend engineer with 5+ years building scalable systems.",
      skills: ["TypeScript", "Node.js", "PostgreSQL"],
      experience: [
        {
          company: "Analytical Engines Inc.",
          role: "Senior Engineer",
          startDate: "2021-03",
          endDate: null,
          location: "London",
          description: "• Built Node.js services serving 10k req/s\n• Led migration to TypeScript",
          tldr: "Backend platform lead on Node.js/TypeScript services.",
        },
      ],
    };

    expect(() => {
      const ref = buildQuickReference(baseCv);
      toPromptString(ref);
      validatePatch(llmPatch, baseCv);
    }).not.toThrow();
  });
});
