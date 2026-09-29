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
import { buildCvContext } from "@/lib/ai/context-selection";

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

describe("optimize route — context composition (reported Italian whole-CV review scenario)", () => {
  // Synthetic reproduction of the user-reported shape:
  // populated projects, populated experience descriptions, EMPTY certifications.
  const reportedCv: CVState = {
    ...baseCv,
    experience: [
      {
        company: "Acme Corp",
        role: "Senior Developer",
        startDate: "2021",
        endDate: null,
        description: "• Built platform services\n• Led team of 4",
        tldr: "Platform lead for high-traffic services.",
      },
      {
        company: "Beta Labs",
        role: "Developer",
        startDate: "2018",
        endDate: "2021",
        description: "• Shipped e-commerce checkout",
        tldr: "E-commerce checkout developer.",
      },
    ],
    projects: [
      {
        name: "CraftCV",
        role: "Solo Developer",
        link: "https://craftcv.online",
        description: "• Full CV builder with ATS scoring",
        tldr: "ATS-aware CV builder used by 2k users.",
      },
      {
        name: "OpenRails",
        role: "Maintainer",
        link: "https://github.com/example/openrails",
        description: "• Open-source train scheduling library",
      },
      {
        name: "Sudoku Solver",
        role: "Author",
        link: "",
        description: "• Constraint solver toy project",
        tldr: "Backtracking constraint solver.",
      },
    ],
    certifications: [],
  };

  it("Italian general review receives all project names and full experience/project detail", () => {
    const context = buildCvContext(reportedCv, "Ciao! Puoi fare una revisione completa del mio cv?");

    // Snapshot evidence: every project is visible to the model
    expect(context).toContain("[ PROJECTS ]");
    expect(context).toContain("CraftCV");
    expect(context).toContain("OpenRails");
    expect(context).toContain("Sudoku Solver");

    // Detail evidence: experience and project descriptions are expanded
    expect(context).toContain("## Full Detail Context");
    expect(context).toContain("• Built platform services");
    expect(context).toContain("• Shipped e-commerce checkout");
    expect(context).toContain("• Full CV builder with ATS scoring");
    expect(context).toContain("• Open-source train scheduling library");
    expect(context).toContain("• Constraint solver toy project");

    // Certifications remain genuinely empty — never invented
    expect(context).not.toContain("[ CERTIFICATIONS ]");
    expect(buildQuickReference(reportedCv).certs).toEqual([]);
  });

  it("compact requests avoid the full-detail block and stay smaller than the full JSON", () => {
    const compactContext = buildCvContext(reportedCv, "what is ATS?");
    expect(compactContext).not.toContain("## Full Detail Context");

    const compactTokens = estimateTokens(compactContext);
    const fullTokens = estimateTokens(JSON.stringify(reportedCv));
    expect(compactTokens).toBeLessThan(fullTokens);
  });

  it("English general review also receives the full-detail payload", () => {
    const context = buildCvContext(reportedCv, "can you review my cv?");
    expect(context).toContain("## Full Detail Context");
    expect(context).toContain("• Built platform services");
    expect(context).toContain("• Full CV builder with ATS scoring");
  });

  it("personal contact fields never enter the context (FR-10)", () => {
    const context = buildCvContext(reportedCv, "rivedi il mio cv");
    expect(context).not.toContain("ada@example.com");
    expect(context).not.toContain("+44 1234");
    expect(context).not.toContain("Ada Lovelace");
  });
});
