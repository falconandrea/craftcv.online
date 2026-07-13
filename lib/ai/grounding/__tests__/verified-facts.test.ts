import { describe, it, expect } from "vitest";
import { extractVerifiedFacts } from "../verified-facts";
import type { CVState } from "@/state/types";
import { defaultCVState } from "@/state/types";

function makeCv(overrides: Partial<CVState>): CVState {
  return { ...defaultCVState, ...overrides };
}

describe("extractVerifiedFacts", () => {
  it("returns empty array for empty CV", () => {
    const facts = extractVerifiedFacts(defaultCVState);
    expect(facts).toEqual([]);
  });

  it("extracts experience dates", () => {
    const cv = makeCv({
      experience: [
        {
          company: "Acme",
          role: "Dev",
          startDate: "2022-03",
          endDate: "2024-01",
          description: "• Built things",
        },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const temporals = facts.filter((f) => f.type === "temporal");
    expect(temporals).toHaveLength(2);
    expect(temporals[0]).toMatchObject({ value: "2022-03", sourcePath: "experience[0].startDate" });
    expect(temporals[1]).toMatchObject({ value: "2024-01", sourcePath: "experience[0].endDate" });
  });

  it("extracts numeric metrics from experience description", () => {
    const cv = makeCv({
      experience: [
        {
          company: "Acme",
          role: "Dev",
          startDate: "2022-03",
          endDate: null,
          description: "• Improved latency by 40%\n• Handled 10,000 req/s\n• Led team of 12",
        },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const numerics = facts.filter((f) => f.type === "numeric");
    expect(numerics.some((f) => f.value === "40%")).toBe(true);
    expect(numerics.some((f) => f.value.includes("10,000"))).toBe(true);
    expect(numerics.some((f) => f.value === "12")).toBe(true);
  });

  it("extracts education years", () => {
    const cv = makeCv({
      education: [
        { degree: "BSc Computer Science", institution: "MIT", location: "US", year: "2021" },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const temporals = facts.filter((f) => f.type === "temporal");
    expect(temporals).toHaveLength(1);
    expect(temporals[0]).toMatchObject({ value: "2021", sourcePath: "education[0].year" });
  });

  it("extracts numeric grade from education degree", () => {
    const cv = makeCv({
      education: [
        { degree: "Laurea Magistrale 110/110 cum laude", institution: "Polimi", location: "IT", year: "2020" },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const numerics = facts.filter((f) => f.type === "numeric");
    expect(numerics.some((f) => f.value === "110")).toBe(true);
  });

  it("extracts certification identity facts", () => {
    const cv = makeCv({
      certifications: [
        { title: "AWS Solutions Architect", issuer: "Amazon", year: "2023" },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const identities = facts.filter((f) => f.type === "identity");
    expect(identities).toHaveLength(1);
    expect(identities[0].value).toBe("AWS Solutions Architect | Amazon");
  });

  it("extracts certification years", () => {
    const cv = makeCv({
      certifications: [
        { title: "CKA", issuer: "CNCF", year: "2023" },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const temporals = facts.filter((f) => f.type === "temporal");
    expect(temporals).toHaveLength(1);
    expect(temporals[0]).toMatchObject({ value: "2023", sourcePath: "certifications[0].year" });
  });

  it("extracts numeric metrics from project descriptions", () => {
    const cv = makeCv({
      projects: [
        { name: "FastAPI", role: "Lead", link: "", description: "• Achieved 99.9% uptime" },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const numerics = facts.filter((f) => f.type === "numeric");
    expect(numerics.some((f) => f.value === "99.9%")).toBe(true);
  });

  it("does not extract single-digit numbers", () => {
    const cv = makeCv({
      experience: [
        {
          company: "Acme",
          role: "Dev",
          startDate: "2022-03",
          endDate: null,
          description: "• Fixed 3 bugs",
        },
      ],
    });
    const facts = extractVerifiedFacts(cv);
    const numerics = facts.filter((f) => f.type === "numeric");
    expect(numerics.some((f) => f.value === "3")).toBe(false);
  });
});
