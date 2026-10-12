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
        phone: "",
        timezone: "",
        links: ["github.com/johndoe"],
      },
      summary: "Backend engineer.",
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
      languages: [{ language: "English", proficiency: "Fluent" }],
      customSection: { title: "Interests", content: "Open source" },
    };

    const ref = buildQuickReference(cv);
    const output = toPromptString(ref);

    expect(output).toContain("[ IDENTITY ]");
    expect(output).toContain("Title: Developer");
    expect(output).toContain("Location: New York");
    expect(output).toContain("github.com/johndoe");
    expect(output).toContain("[ SUMMARY ]");
    expect(output).toContain("Backend engineer.");
    expect(output).toContain("[ ROLES ]");
    expect(output).toContain("- Developer @ Acme (2020 - Present)");
    expect(output).toContain("TLDR: Built great things.");
    expect(output).toContain("[ TOP SKILLS ]");
    expect(output).toContain("React, TypeScript");
    expect(output).toContain("[ LANGUAGES ]");
    expect(output).toContain("English (Fluent)");
    expect(output).toContain("[ CUSTOM SECTION: Interests ]");
    expect(output).toContain("Open source");
  });

  it("REGRESSION: snapshot now includes summary, languages, customSection (previously missing, causing LLM to blank them)", () => {
    const cv = {
      ...defaultCVState,
      summary: "Don't blank me.",
      languages: [{ language: "Italian", proficiency: "Native" }],
      customSection: { title: "Hobbies", content: "Chess" },
    };
    const ref = buildQuickReference(cv);
    expect(ref.summary).toBe("Don't blank me.");
    expect(ref.languages).toEqual([{ language: "Italian", proficiency: "Native" }]);
    expect(ref.customSection).toEqual({ title: "Hobbies", content: "Chess" });
  });

  it("REGRESSION (review): per-entry locations are part of the AI context", () => {
    // Root cause of the education-location wipe: the snapshot omitted
    // locations, so the model emitted "" and only the destructive-change
    // guard saved the data. The context must now carry the real values.
    const cv = {
      ...defaultCVState,
      experience: [
        {
          company: "Studio Interfacce Demo",
          role: "Frontend Developer",
          startDate: "2022-03",
          endDate: "2025-06",
          location: "Torino, Italia",
          description: "",
        },
      ],
      education: [
        {
          degree: "Laurea in Informatica",
          institution: "Università Demo",
          location: "Torino, Italia",
          year: "2021",
        },
      ],
    };
    const ref = buildQuickReference(cv);
    const output = toPromptString(ref);

    expect(output).toContain("- Frontend Developer @ Studio Interfacce Demo (2022-03 - 2025-06, Torino, Italia)");
    expect(output).toContain("Laurea in Informatica @ Università Demo (2021, Torino, Italia)");
  });

  it("keeps the roles and education formats unchanged when locations are absent", () => {
    const cv = {
      ...defaultCVState,
      experience: [
        { company: "Acme", role: "Dev", startDate: "2020", endDate: null, description: "" },
      ],
      education: [
        { degree: "BSc", institution: "MIT", location: "", year: "2021" },
      ],
    };
    const output = toPromptString(buildQuickReference(cv));
    expect(output).toContain("- Dev @ Acme (2020 - Present)");
    expect(output).toContain("BSc @ MIT (2021)");
  });

  it("omits custom section from prompt when content is empty (less noise for the LLM)", () => {
    const cv = {
      ...defaultCVState,
      customSection: { title: "Interests", content: "" },
    };
    const ref = buildQuickReference(cv);
    const output = toPromptString(ref);
    expect(output).not.toContain("[ CUSTOM SECTION");
  });
});

describe("REGRESSION: projects in the snapshot", () => {
  // Synthetic reproduction of the reported shape:
  // populated projects, populated experience descriptions, NO certifications.
  const cvWithProjects = {
    ...defaultCVState,
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
        // no tldr on purpose: project must still appear
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

  it("every source project name appears in the prompt string", () => {
    const ref = buildQuickReference(cvWithProjects);
    const output = toPromptString(ref);

    expect(output).toContain("[ PROJECTS ]");
    expect(output).toContain("CraftCV");
    expect(output).toContain("OpenRails");
    expect(output).toContain("Sudoku Solver");
  });

  it("keeps projects visible when optional tldr or link are missing", () => {
    const ref = buildQuickReference(cvWithProjects);
    const output = toPromptString(ref);

    // OpenRails has no tldr, Sudoku Solver has no link — both must still be listed
    expect(output).toContain("OpenRails");
    expect(output).toContain("Sudoku Solver");
    expect(ref.projects).toHaveLength(3);
  });

  it("preserves the user's CV order for projects", () => {
    const ref = buildQuickReference(cvWithProjects);
    expect(ref.projects.map(p => p.name)).toEqual([
      "CraftCV",
      "OpenRails",
      "Sudoku Solver",
    ]);
  });

  it("does not invent certifications when the source array is empty", () => {
    const ref = buildQuickReference(cvWithProjects);
    expect(ref.certs).toEqual([]);
    const output = toPromptString(ref);
    expect(output).not.toContain("[ CERTIFICATIONS ]");
  });
});
