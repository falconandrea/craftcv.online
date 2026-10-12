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

    it("REGRESSION (review r4): altered date matching a duplicate sibling does not pass silently (two-item)", () => {
      // Defect: with two Acme/Developer entries (2019-01 and 2022-01), a patch
      // that alters the FIRST startDate to 2022-01 made BOTH items associate
      // with the second CV entry — the alteration passed without any
      // rejectedVerifiedEdits and the first entry's real date was lost.
      const cv = makeCv({
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2019-01", endDate: "2020-12", location: "Roma, Italia",
            description: "• First stint",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2022-01", endDate: null, location: "Torino, Italia",
            description: "• Second stint",
          },
        ],
      });
      const patch: CVPatch = {
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2022-01", endDate: "2020-12", location: "",
            description: "• First stint, altered date",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2022-01", endDate: null, location: "",
            description: "• Second stint",
          },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      // One-to-one assignment: the first item stays with the first CV entry
      // (index corroborates; the alterable date does not outvote it) and the
      // altered startDate is blocked with an explicit rejected edit.
      const first = cleanPatch.experience?.[0];
      expect(first?.startDate).toBe("2019-01");
      expect(first?.endDate).toBe("2020-12");
      expect(first?.location).toBe("Roma, Italia");
      const second = cleanPatch.experience?.[1];
      expect(second?.startDate).toBe("2022-01");
      expect(second?.location).toBe("Torino, Italia");
      expect(report.rejectedVerifiedEdits.some((r) => r.proposed === "2022-01")).toBe(true);
    });

    it("REGRESSION (review r4): date-only evidence among duplicates holds the section for review", () => {
      // The first CV entry (2019-01) comes back with BOTH dates altered to
      // look exactly like the second (2022-01/null): the only evidence
      // pointing at the second entry is the alterable dates themselves, which
      // conflict with the index evidence pointing at the first. Ambiguous and
      // corruption-prone → the section is held back with an explicit flag.
      const cv = makeCv({
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2019-01", endDate: "2020-12", location: "Roma, Italia",
            description: "• First stint",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2022-01", endDate: null, location: "Torino, Italia",
            description: "• Second stint",
          },
        ],
      });
      const patch: CVPatch = {
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2022-01", endDate: null, location: "",
            description: "• First stint with both dates altered",
          },
          {
            company: "Beta Labs", role: "Analyst",
            startDate: "2024-01", endDate: null, location: "",
            description: "• New unrelated entry",
          },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.experience).toBeUndefined();
      const flag = report.flaggedInventions.find((f) => f.category === "association");
      expect(flag).toBeDefined();
      expect(flag?.term).toBe("experience");
      expect(flag?.message).toContain("discarded");
      expect(flag?.message).toContain("specific");
    });

    it("REGRESSION (review r4): a new duplicate entry cannot inherit the existing entry's dates or location", () => {
      // Defect: association was not one-to-one, so a NEW Acme/Developer item
      // could be associated with the same CV entry and receive its restored
      // location and dates.
      const cv = makeCv({
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2019-01", endDate: null, location: "Roma, Italia",
            description: "• Existing stint",
          },
        ],
      });
      const patch: CVPatch = {
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2019-01", endDate: null, location: "Roma, Italia",
            description: "• Existing stint",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2024-01", endDate: null, location: "",
            description: "• New stint added by the AI",
          },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      const existing = cleanPatch.experience?.[0];
      expect(existing?.startDate).toBe("2019-01");
      expect(existing?.location).toBe("Roma, Italia");
      const added = cleanPatch.experience?.[1];
      // The new entry must not inherit Rome or the 2019 date.
      expect(added?.startDate).toBe("2024-01");
      expect(added?.location).toBe("");
      // No date injection disguised as a "rejected" edit.
      expect(report.rejectedVerifiedEdits).toHaveLength(0);
      expect(report.flaggedInventions.some((f) => f.category === "association")).toBe(false);
    });

    it("REGRESSION (review r3): reordered experience restores name, dates and location together (combined)", () => {
      const cv = makeCv({
        experience: [
          {
            company: "Studio Interfacce Demo", role: "Frontend Developer",
            startDate: "2022-03", endDate: "2025-06", location: "Torino, Italia",
            description: "• Built interfaces",
          },
          {
            company: "Beta Consulting", role: "Backend Developer",
            startDate: "2020-01", endDate: "2021-12", location: "Milano, Italia",
            description: "• Built services",
          },
        ],
      });
      // AI reorders the array AND alters Beta's startDate AND blanks both locations.
      // Index-based protection would give Beta the 2022-03 date and Torino location.
      const patch: CVPatch = {
        experience: [
          {
            company: "Beta Consulting", role: "Backend Developer",
            startDate: "2019-06", endDate: "2021-12", location: "",
            description: "• Built services",
          },
          {
            company: "Studio Interfacce Demo", role: "Frontend Developer",
            startDate: "2022-03", endDate: "2025-06", location: "",
            description: "• Built interfaces",
          },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      const beta = cleanPatch.experience?.[0];
      expect(beta?.company).toBe("Beta Consulting");
      expect(beta?.startDate).toBe("2020-01");
      expect(beta?.endDate).toBe("2021-12");
      expect(beta?.location).toBe("Milano, Italia");
      const studio = cleanPatch.experience?.[1];
      expect(studio?.company).toBe("Studio Interfacce Demo");
      expect(studio?.startDate).toBe("2022-03");
      expect(studio?.location).toBe("Torino, Italia");
      expect(report.rejectedVerifiedEdits.some((r) => r.proposed === "2019-06")).toBe(true);
    });

    it("REGRESSION (review r3): reordered education restores name, year and location together (combined)", () => {
      const cv = makeCv({
        education: [
          { degree: "Laurea in Informatica", institution: "Università Demo", location: "Torino, Italia", year: "2021" },
          { degree: "Master in UX", institution: "Politecnico", location: "Milano, Italia", year: "2023" },
        ],
      });
      const patch: CVPatch = {
        education: [
          { degree: "Master in UX", institution: "Politecnico", location: "", year: "2022" },
          { degree: "Laurea in Informatica", institution: "Università Demo", location: "", year: "2021" },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      const master = cleanPatch.education?.[0];
      expect(master?.institution).toBe("Politecnico");
      expect(master?.year).toBe("2023");
      expect(master?.location).toBe("Milano, Italia");
      const laurea = cleanPatch.education?.[1];
      expect(laurea?.institution).toBe("Università Demo");
      expect(laurea?.year).toBe("2021");
      expect(laurea?.location).toBe("Torino, Italia");
      expect(report.rejectedVerifiedEdits.some((r) => r.proposed === "2022")).toBe(true);
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

  // ─────────────────────────────────────────────────────────────────────
  // Destructive change prevention (Check 0)
  // Catches the LLM "blanking out" fields it couldn't see in the snapshot.
  // This is the bug class that wiped summary/languages in production.
  // ─────────────────────────────────────────────────────────────────────
  describe("Destructive change prevention", () => {
    it("REGRESSION: drops summary when LLM replaces non-empty summary with empty string", () => {
      const cv = makeCv({ summary: "Backend engineer with 5 years of experience." });
      const patch: CVPatch = { summary: "" };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.summary).toBeUndefined();
    });

    it("REGRESSION: drops languages when LLM replaces non-empty array with []", () => {
      const cv = makeCv({ languages: [{ language: "English", proficiency: "Fluent" }] });
      const patch: CVPatch = { languages: [] };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.languages).toBeUndefined();
    });

    it("REGRESSION: drops skills when LLM replaces non-empty array with []", () => {
      const cv = makeCv({ skills: ["React", "Node"] });
      const patch: CVPatch = { skills: [] };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.skills).toBeUndefined();
    });

    it("REGRESSION: restores customSection.content when LLM blanks it", () => {
      const cv = makeCv({
        customSection: { title: "Interests", content: "Open source, climbing" },
      });
      const patch: CVPatch = {
        customSection: { title: "Interests", content: "" },
      };
      const { cleanPatch } = validatePatch(patch, cv);
      // customSection is preserved as an object so other valid changes (e.g. title) can apply,
      // but content is restored to its non-empty value.
      expect(cleanPatch.customSection?.content).toBe("Open source, climbing");
    });

    it("allows summary change when going from empty to non-empty (additive)", () => {
      const cv = makeCv({ summary: "" });
      const patch: CVPatch = { summary: "New summary by AI." };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.summary).toBe("New summary by AI.");
    });

    it("allows summary change when both current and proposed are non-empty (improvement)", () => {
      const cv = makeCv({ summary: "Old summary." });
      const patch: CVPatch = { summary: "Improved summary." };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.summary).toBe("Improved summary.");
    });

    it("allows the user to genuinely clear a field if it was already empty", () => {
      const cv = makeCv({ summary: "" });
      const patch: CVPatch = { summary: "" };
      const { cleanPatch } = validatePatch(patch, cv);
      // No-op: nothing to clear, nothing destructive.
      expect(cleanPatch.summary).toBe("");
    });

    it("REGRESSION (review r3): altered startDate with blanked location restores BOTH date and location", () => {
      const cv = makeCv({
        experience: [{
          company: "Studio Interfacce Demo", role: "Frontend Developer",
          startDate: "2022-03", endDate: "2025-06", location: "Torino, Italia",
          description: "• Built interfaces",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Studio Interfacce Demo", role: "Frontend Developer",
          startDate: "2021-01", endDate: "2025-06", location: "",
          description: "• Built interfaces",
        }],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.experience?.[0].startDate).toBe("2022-03");
      expect(cleanPatch.experience?.[0].location).toBe("Torino, Italia");
      expect(report.rejectedVerifiedEdits.some((r) => r.proposed === "2021-01")).toBe(true);
    });

    it("REGRESSION (review r3): altered year with blanked location restores BOTH year and location", () => {
      const cv = makeCv({
        education: [{ degree: "Laurea in Informatica", institution: "Università Demo", location: "Torino, Italia", year: "2021" }],
      });
      const patch: CVPatch = {
        education: [{ degree: "Laurea in Informatica", institution: "Università Demo", location: "", year: "2020" }],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.education?.[0].year).toBe("2021");
      expect(cleanPatch.education?.[0].location).toBe("Torino, Italia");
      expect(report.rejectedVerifiedEdits.some((r) => r.proposed === "2020")).toBe(true);
    });

    it("REGRESSION: restores education[i].location when the AI patch blanks it", () => {
      // Reproduces the manual OpenRouter test (2026-10-11): a full-CV
      // translation proposal returned education[0] with location "" because
      // the quick-reference snapshot does not include education locations,
      // and applyAiPatch replaces the array wholesale.
      const cv = makeCv({
        education: [{
          degree: "Laurea in Informatica",
          institution: "Università Demo",
          location: "Torino, Italia",
          year: "2021",
        }],
      });
      const patch: CVPatch = {
        education: [{
          degree: "Bachelor's Degree in Computer Science",
          institution: "Università Demo",
          location: "",
          year: "2021",
        }],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.education?.[0].location).toBe("Torino, Italia");
    });

    it("REGRESSION (review): associates education location by entry identity when the patch reorders entries", () => {
      const cv = makeCv({
        education: [
          { degree: "Laurea in Informatica", institution: "Università Demo", location: "Torino, Italia", year: "2021" },
          { degree: "Master in UX", institution: "Politecnico", location: "Milano, Italia", year: "2023" },
        ],
      });
      const patch: CVPatch = {
        education: [
          { degree: "Master in UX", institution: "Politecnico", location: "", year: "2023" },
          { degree: "Laurea in Informatica", institution: "Università Demo", location: "", year: "2021" },
        ],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      // Index-based restore would cross-assign Torino→Master and Milano→Laurea.
      expect(cleanPatch.education?.[0].location).toBe("Milano, Italia");
      expect(cleanPatch.education?.[1].location).toBe("Torino, Italia");
    });

    it("REGRESSION (review): associates experience location by entry identity when the patch reorders entries", () => {
      const cv = makeCv({
        experience: [
          {
            company: "Studio Interfacce Demo", role: "Frontend Developer",
            startDate: "2022-03", endDate: "2025-06", location: "Torino, Italia",
            description: "• Built interfaces",
          },
          {
            company: "Beta Consulting", role: "Backend Developer",
            startDate: "2020-01", endDate: "2021-12", location: "Milano, Italia",
            description: "• Built services",
          },
        ],
      });
      const patch: CVPatch = {
        experience: [
          {
            company: "Beta Consulting", role: "Backend Developer",
            startDate: "2020-01", endDate: "2021-12", location: "",
            description: "• Built services",
          },
          {
            company: "Studio Interfacce Demo", role: "Frontend Developer",
            startDate: "2022-03", endDate: "2025-06", location: "",
            description: "• Built interfaces",
          },
        ],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.experience?.[0].location).toBe("Milano, Italia");
      expect(cleanPatch.experience?.[1].location).toBe("Torino, Italia");
    });

    it("handles duplicate identities explicitly: prefers the same-index match, never a foreign entry", () => {
      // Two stints at the same company+role with different locations: identity
      // alone is ambiguous, so the same-index match breaks the tie.
      const cv = makeCv({
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2019-01", endDate: "2020-12", location: "Roma, Italia",
            description: "• First stint",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2022-01", endDate: null, location: "Torino, Italia",
            description: "• Second stint",
          },
        ],
      });
      const patch: CVPatch = {
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2019-01", endDate: "2020-12", location: "",
            description: "• First stint",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2022-01", endDate: null, location: "",
            description: "• Second stint",
          },
        ],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.experience?.[0].location).toBe("Roma, Italia");
      expect(cleanPatch.experience?.[1].location).toBe("Torino, Italia");
    });

    it("REGRESSION (review r5): identical-identity entries with different locations are held, not swapped by index", () => {
      // Two entries share company, role AND dates; only descriptions and
      // locations differ. A reordered patch with blanked locations used to be
      // restored POSITIONALLY (locations silently swapped) with no flag,
      // because index agreement "resolved" candidates the dates cannot
      // distinguish. Ambiguous identity + differing possible location
      // restores → hold the section and flag it (no index guessing).
      const cv = makeCv({
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2020-01", endDate: "2021-12", location: "Roma, Italia",
            description: "• First project",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2020-01", endDate: "2021-12", location: "Torino, Italia",
            description: "• Second project",
          },
        ],
      });
      const patch: CVPatch = {
        experience: [
          {
            company: "Acme", role: "Developer",
            startDate: "2020-01", endDate: "2021-12", location: "",
            description: "• Second project, reordered first",
          },
          {
            company: "Acme", role: "Developer",
            startDate: "2020-01", endDate: "2021-12", location: "",
            description: "• First project, reordered second",
          },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      // Full-pipeline outcome: the section is discarded (never applied with
      // guessed locations) and surfaced for a more specific retry.
      expect(cleanPatch.experience).toBeUndefined();
      const flag = report.flaggedInventions.find((f) => f.category === "association");
      expect(flag).toBeDefined();
      expect(flag?.term).toBe("experience");
      expect(flag?.message).toContain("discarded");
      expect(flag?.message).toContain("specific");
    });

    it("REGRESSION (review r3, semantics updated r5): identical twins with different locations are held, not positionally restored", () => {
      // Real ambiguity: every identity layer and the protected year yield the
      // same values for both CV entries; only locations differ. Possible
      // location restores differ → the section is discarded and flagged
      // instead of guessing by index (review r5).
      const cv = makeCv({
        education: [
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "Torino, Italia", year: "2020" },
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "Milano, Italia", year: "2020" },
        ],
      });
      const patch: CVPatch = {
        education: [
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "", year: "2020" },
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "", year: "2020" },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.education).toBeUndefined();
      const flag = report.flaggedInventions.find((f) => f.category === "association");
      expect(flag).toBeDefined();
      expect(flag?.term).toBe("education");
    });

    it("REGRESSION (review r3, semantics updated r5): ambiguous twin without index corroboration also holds the section", () => {
      // Same ambiguous pair; the blanked entry sits at a patch index that is
      // NOT one of the CV matches. Even though the other two items carry
      // their own locations (no restore needed), the blanked twin's possible
      // restores differ → the whole section is discarded and flagged.
      const cv = makeCv({
        education: [
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "Torino, Italia", year: "2020" },
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "Milano, Italia", year: "2020" },
        ],
      });
      const patch: CVPatch = {
        education: [
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "Roma, Italia", year: "2020" },
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "Roma, Italia", year: "2020" },
          { degree: "Corso Certificato", institution: "Accademia Demo", location: "", year: "2020" },
        ],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.education).toBeUndefined();
      expect(report.flaggedInventions.some((f) => f.category === "association" && f.term === "education")).toBe(true);
    });

    it("leaves a new or renamed entry's location untouched instead of assigning foreign data", () => {
      const cv = makeCv({
        education: [
          { degree: "Laurea in Informatica", institution: "Università Demo", location: "Torino, Italia", year: "2021" },
        ],
      });
      const patch: CVPatch = {
        education: [
          // Renamed identity at the same index: association is unreliable,
          // must not borrow Torino. (Year is unchanged so the adjacent
          // year-protection stays silent and this test stays focused.)
          { degree: "Bachelor's Degree in Computer Science", institution: "Different University", location: "", year: "2021" },
          // Unrelated new entry appended by the AI: no CV identity to restore from.
          { degree: "Corso di specializzazione", institution: "Ente Nuovo", location: "", year: "2024" },
        ],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.education?.[0].location).toBe("");
      expect(cleanPatch.education?.[1].location).toBe("");
    });

    it("REGRESSION: restores experience[i].location when the AI patch blanks it", () => {
      const cv = makeCv({
        experience: [{
          company: "Studio Interfacce Demo",
          role: "Frontend Developer",
          startDate: "2022-03",
          endDate: "2025-06",
          location: "Torino, Italia",
          description: "• Built interfaces",
        }],
      });
      const patch: CVPatch = {
        experience: [{
          company: "Studio Interfacce Demo",
          role: "Frontend Developer",
          startDate: "2022-03",
          endDate: "2025-06",
          location: "",
          description: "• Built interfaces",
        }],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.experience?.[0].location).toBe("Torino, Italia");
    });

    it("keeps a legitimately emptied location when the CV value was already empty", () => {
      const cv = makeCv({
        education: [{
          degree: "BSc CS",
          institution: "MIT",
          location: "",
          year: "2021",
        }],
      });
      const patch: CVPatch = {
        education: [{ degree: "BSc CS", institution: "MIT", location: "", year: "2021" }],
      };
      const { cleanPatch, report } = validatePatch(patch, cv);
      expect(cleanPatch.education?.[0].location).toBe("");
      expect(report.rejectedVerifiedEdits).toHaveLength(0);
    });

    it("allows filling an empty location (additive change)", () => {
      const cv = makeCv({
        education: [{ degree: "BSc CS", institution: "MIT", location: "", year: "2021" }],
      });
      const patch: CVPatch = {
        education: [{ degree: "BSc CS", institution: "MIT", location: "Cambridge, MA", year: "2021" }],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.education?.[0].location).toBe("Cambridge, MA");
    });

    it("preserves unrelated fields in the patch when dropping destructive ones", () => {
      const cv = makeCv({
        summary: "Existing summary.",
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built things",
        }],
      });
      const patch: CVPatch = {
        summary: "", // destructive
        experience: [{
          company: "Acme", role: "Dev", startDate: "2022-03", endDate: null,
          description: "• Built scalable things with quantified impact",
        }],
      };
      const { cleanPatch } = validatePatch(patch, cv);
      expect(cleanPatch.summary).toBeUndefined();
      expect(cleanPatch.experience).toBeDefined();
      expect(cleanPatch.experience?.[0].description).toContain("scalable");
    });
  });
});
