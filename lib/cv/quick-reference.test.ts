import { describe, it, expect } from "vitest";
import { buildQuickReference, toPromptString } from "./quick-reference";
import { defaultCVState } from "@/state/types";

describe("buildQuickReference", () => {
  it("computes currentTitle correctly", () => {
    const cv = {
      ...defaultCVState,
      experience: [
        {
          company: "Past Inc",
          role: "Junior",
          startDate: "2018",
          endDate: "2019",
          description: "",
        },
        {
          company: "Acme",
          role: "Senior Developer",
          startDate: "2020",
          endDate: null, // Present
          description: "",
        },
      ],
    };

    const ref = buildQuickReference(cv);
    expect(ref.identity.currentTitle).toBe("Senior Developer");
  });

  it("sorts topSkills by evidence frequency and limits to 15", () => {
    // Generate 20 skills
    const skills = Array.from({ length: 20 }, (_, i) => `Skill${i}`);
    const cv = {
      ...defaultCVState,
      skills,
      experience: [
        {
          company: "A",
          role: "Dev",
          startDate: "2020",
          endDate: null,
          // Evidences "Skill0" heavily
          description: "Skill0 Skill0 Skill0",
        },
        {
          company: "B",
          role: "Dev",
          startDate: "2019",
          endDate: "2020",
          // Evidences "Skill5"
          description: "Skill5",
        },
      ],
    };

    const ref = buildQuickReference(cv);
    expect(ref.topSkills).toHaveLength(15);
    // Skill0 should be first (most evidence)
    expect(ref.topSkills[0]).toBe("Skill0");
    // Skill5 should be second
    expect(ref.topSkills[1]).toBe("Skill5");
  });

  it("handles missing tldr gracefully", () => {
    const cv = {
      ...defaultCVState,
      experience: [
        {
          company: "Acme",
          role: "Dev",
          startDate: "2020",
          endDate: null,
          description: "",
        },
      ],
    };
    const ref = buildQuickReference(cv);
    expect(ref.roles[0].tldr).toBeUndefined();
  });
});

describe("toPromptString", () => {
  it("formats the snapshot correctly", () => {
    const cv = {
      ...defaultCVState,
      personalInfo: {
        fullName: "John Doe",
        location: "New York",
        email: "john@example.com",
        links: ["github.com/johndoe"],
      },
      skills: ["React", "TypeScript"],
      experience: [
        {
          company: "Acme",
          role: "Developer",
          startDate: "2020",
          endDate: null,
          description: "Used React.",
          tldr: "Built great things.",
        },
      ],
    };

    const ref = buildQuickReference(cv);
    const output = toPromptString(ref);

    expect(output).toContain("[ IDENTITY ]");
    expect(output).toContain("Title: Developer");
    expect(output).toContain("Location: New York");
    expect(output).toContain("github.com/johndoe");
    expect(output).toContain("[ ROLES ]");
    expect(output).toContain("- Developer @ Acme (2020 - Present)");
    expect(output).toContain("TLDR: Built great things.");
    expect(output).toContain("[ TOP SKILLS ]");
    expect(output).toContain("React, TypeScript");
  });
});
