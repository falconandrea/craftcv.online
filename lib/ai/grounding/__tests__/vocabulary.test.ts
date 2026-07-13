import { describe, it, expect } from "vitest";
import { buildVocabulary, isInVocabulary } from "../vocabulary";
import type { CVState } from "@/state/types";
import { defaultCVState } from "@/state/types";

function makeCv(overrides: Partial<CVState>): CVState {
  return { ...defaultCVState, ...overrides };
}

describe("buildVocabulary", () => {
  it("returns empty array for empty CV", () => {
    const vocab = buildVocabulary(defaultCVState);
    expect(vocab).toEqual([]);
  });

  it("extracts skills", () => {
    const cv = makeCv({ skills: ["React", "TypeScript", "Node.js"] });
    const vocab = buildVocabulary(cv);
    expect(vocab).toHaveLength(3);
    expect(vocab.every((v) => v.category === "skill")).toBe(true);
    expect(vocab.map((v) => v.term)).toEqual(["react", "ts", "node"]);
  });

  it("extracts companies and roles from experience", () => {
    const cv = makeCv({
      experience: [
        { company: "Google", role: "Senior Engineer", startDate: "2022-01", endDate: null, description: "" },
        { company: "Meta", role: "Staff Engineer", startDate: "2020-01", endDate: "2021-12", description: "" },
      ],
    });
    const vocab = buildVocabulary(cv);
    const companies = vocab.filter((v) => v.category === "company");
    const roles = vocab.filter((v) => v.category === "role");
    expect(companies).toHaveLength(2);
    expect(roles).toHaveLength(2);
    expect(companies.map((v) => v.term)).toEqual(["google", "meta"]);
  });

  it("extracts project names", () => {
    const cv = makeCv({
      projects: [{ name: "CraftCV", role: "Lead", link: "", description: "" }],
    });
    const vocab = buildVocabulary(cv);
    expect(vocab.some((v) => v.term === "craftcv" && v.category === "project")).toBe(true);
  });

  it("extracts certification titles as tools", () => {
    const cv = makeCv({
      certifications: [{ title: "AWS Solutions Architect", issuer: "Amazon", year: "2023" }],
    });
    const vocab = buildVocabulary(cv);
    expect(vocab.some((v) => v.term === "aws solutions architect" && v.category === "tool")).toBe(true);
  });

  it("deduplicates entries", () => {
    const cv = makeCv({
      skills: ["React", "react", "REACT"],
    });
    const vocab = buildVocabulary(cv);
    expect(vocab.filter((v) => v.term === "react")).toHaveLength(1);
  });

  it("skips empty strings", () => {
    const cv = makeCv({ skills: ["", "  ", "React"] });
    const vocab = buildVocabulary(cv);
    expect(vocab).toHaveLength(1);
    expect(vocab[0].term).toBe("react");
  });
});

describe("isInVocabulary", () => {
  const vocab = buildVocabulary(
    makeCv({
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
      experience: [
        { company: "Google", role: "Senior Engineer", startDate: "2022-01", endDate: null, description: "" },
      ],
    })
  );

  it("matches exact term (case-insensitive)", () => {
    expect(isInVocabulary("React", vocab)).toBe(true);
    expect(isInVocabulary("react", vocab)).toBe(true);
    expect(isInVocabulary("REACT", vocab)).toBe(true);
  });

  it("returns false for absent terms", () => {
    expect(isInVocabulary("Kubernetes", vocab)).toBe(false);
    expect(isInVocabulary("Docker", vocab)).toBe(false);
  });

  it("fuzzy matches React.js variants", () => {
    expect(isInVocabulary("React.js", vocab)).toBe(true);
    expect(isInVocabulary("ReactJS", vocab)).toBe(true);
  });

  it("fuzzy matches Node variants", () => {
    expect(isInVocabulary("Node", vocab)).toBe(true);
    expect(isInVocabulary("NodeJS", vocab)).toBe(true);
  });

  it("matches company names", () => {
    expect(isInVocabulary("Google", vocab)).toBe(true);
    expect(isInVocabulary("Meta", vocab)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isInVocabulary("", vocab)).toBe(false);
    expect(isInVocabulary("  ", vocab)).toBe(false);
  });
});
