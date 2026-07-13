import { describe, it, expect } from "vitest";
import { validatePatch } from "../validate-patch";
import type { CVState, CVPatch } from "@/state/types";
import { defaultCVState } from "@/state/types";

function makeCv(overrides: Partial<CVState>): CVState {
  return { ...defaultCVState, ...overrides };
}

describe("validatePatch", () => {
  describe("Verified Facts Protection", () => {
    it("rejects education year changes", () => {
      const cv = makeCv({
        education: [{ degree: "BSc CS", institution: "MIT", location: "US", year: "2021" }],
      });
      const patch: CVPatch = {
        education: [{ degree: "BSc CS", institution: "MIT", location: "US", year: "2020" }],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.education?.[0].year).toBe("2021");
      expect(report.rejectedVerifiedEdits).toHaveLength(1);
      expect(report.rejectedVerifiedEdits[0].proposed).toBe("2020");
    });

    it("rejects experience startDate changes", () => {
      const cv = makeCv({
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: "2024-01",
          description: "• Built things",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Acme", role: "Dev", startDate: "2021-01", endDate: "2024-01",
          description: "• Built things",
        }],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.experience?.[0].startDate).toBe("2022-03");
      expect(report.rejectedVerifiedEdits).toHaveLength(1);
    });

    it("allows unchanged verified facts", () => {
      const cv = makeCv({
        education: [{ degree: "BSc CS", institution: "MIT", location: "US", year: "2021" }],
      });
      const patch: CVPatch = {
        education: [{ degree: "BSc Computer Science", institution: "MIT", location: "US", year: "2021" }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.rejectedVerifiedEdits).toHaveLength(0);
    });
  });

  describe("Anti-Invention", () => {
    it("flags new skills not in CV", () => {
      const cv = makeCv({ skills: ["React", "TypeScript"] });
      const patch: CVPatch = { skills: ["React", "TypeScript", "Kubernetes"] };
      const { report } = validatePatch(patch, cv);
      expect(report.flaggedInventions.some((f) => f.term === "Kubernetes")).toBe(true);
    });

    it("does not flag existing skills", () => {
      const cv = makeCv({ skills: ["React", "TypeScript"] });
      const patch: CVPatch = { skills: ["React", "TypeScript"] };
      const { report } = validatePatch(patch, cv);
      expect(report.flaggedInventions).toHaveLength(0);
    });

    it("flags new entities in experience descriptions", () => {
      const cv = makeCv({
        skills: ["React"],
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built React apps",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built React and Kubernetes apps with Docker",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.flaggedInventions.some((f) => f.term === "Kubernetes")).toBe(true);
      expect(report.flaggedInventions.some((f) => f.term === "Docker")).toBe(true);
    });

    it("flags inflated role titles not in CV", () => {
      const cv = makeCv({
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built things",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Acme", role: "Senior Staff Engineer", startDate: "2022-03", endDate: null,
          description: "• Built things",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.flaggedInventions.some((f) => f.term === "Senior Staff Engineer" && f.category === "role")).toBe(true);
    });

    it("flags changed company names not in CV", () => {
      const cv = makeCv({
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built things",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Google", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built things",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.flaggedInventions.some((f) => f.term === "Google" && f.category === "company")).toBe(true);
    });

    it("does not flag role changes that match existing vocabulary", () => {
      const cv = makeCv({
        experience: [
          { company: "Acme", role: "Dev", startDate: "2022-03", endDate: null, description: "" },
          { company: "Beta", role: "Senior Engineer", startDate: "2020-01", endDate: "2022-02", description: "" },
        ],
      });
      const patch: CVPatch = {
        experience: [
          { company: "Acme", role: "Senior Engineer", startDate: "2022-03", endDate: null, description: "" },
          { company: "Beta", role: "Senior Engineer", startDate: "2020-01", endDate: "2022-02", description: "" },
        ],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.flaggedInventions.filter((f) => f.category === "role")).toHaveLength(0);
    });
  });

  describe("Needs-Verification", () => {
    it("flags new metrics in experience", () => {
      const cv = makeCv({
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built REST APIs",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built REST APIs handling 10,000 req/s",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.needsVerification.length).toBeGreaterThan(0);
    });

    it("does not flag existing metrics", () => {
      const cv = makeCv({
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built REST APIs handling 10,000 req/s",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Developed and maintained REST APIs handling 10,000 req/s",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.needsVerification).toHaveLength(0);
    });
  });

  describe("STAR/XYZ Style", () => {
    it("flags passive opener introduced by AI", () => {
      const cv = makeCv({
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built REST APIs with Node.js",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Responsible for REST API development with Node.js",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.styleWarnings).toHaveLength(1);
      expect(report.styleWarnings[0].message).toContain("Passive opener");
    });

    it("does not flag active verb rewrites", () => {
      const cv = makeCv({
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built REST APIs",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Developed and maintained REST APIs",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.styleWarnings).toHaveLength(0);
    });
  });

  describe("Clean patch", () => {
    it("passes through clean patches unchanged", () => {
      const cv = makeCv({
        skills: ["React", "TypeScript"],
        summary: "Senior developer",
      });
      const patch: CVPatch = {
        summary: "Experienced senior developer with 5+ years",
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.summary).toBe(patch.summary);
      expect(report.flaggedInventions).toHaveLength(0);
      expect(report.needsVerification).toHaveLength(0);
      expect(report.rejectedVerifiedEdits).toHaveLength(0);
      expect(report.styleWarnings).toHaveLength(0);
    });

    it("handles multiple violations independently", () => {
      const cv = makeCv({
        skills: ["React"],
        education: [{ degree: "BSc", institution: "MIT", location: "US", year: "2021" }],
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built apps",
        }],
      });
      const patch: CVPatch = {
        skills: ["React", "Kubernetes"],
        education: [{ degree: "BSc", institution: "MIT", location: "US", year: "2020" }],
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Responsible for building apps with 50% improvement",
        }],
      };
      const { report } = validatePatch(patch, cv);
      expect(report.flaggedInventions.length).toBeGreaterThan(0);
      expect(report.rejectedVerifiedEdits.length).toBeGreaterThan(0);
      expect(report.styleWarnings.length).toBeGreaterThan(0);
    });
  });
});
