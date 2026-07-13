import { describe, it, expect } from "vitest";
import { computeSkillEvidence } from "./skill-evidence";
import { defaultCVState } from "@/state/types";

describe("computeSkillEvidence", () => {
  it("finds exact matches in experience", () => {
    const cv = {
      ...defaultCVState,
      skills: ["React"],
      experience: [
        {
          company: "Acme",
          role: "Dev",
          startDate: "2020",
          endDate: null,
          description: "Built apps with React and Node.",
        },
      ],
    };
    
    const result = computeSkillEvidence(cv);
    expect(result[0].name).toBe("React");
    expect(result[0].evidencedIn).toHaveLength(1);
    expect(result[0].evidencedIn[0].type).toBe("experience");
    expect(result[0].evidencedIn[0].label).toBe("Dev @ Acme");
  });

  it("finds synonym matches", () => {
    const cv = {
      ...defaultCVState,
      skills: ["JS"], // The skill is "JS"
      projects: [
        {
          name: "Portfolio",
          role: "Creator",
          link: "",
          description: "Written entirely in JavaScript.", // The text says "JavaScript"
        },
      ],
    };
    
    const result = computeSkillEvidence(cv);
    expect(result[0].name).toBe("JS");
    expect(result[0].evidencedIn).toHaveLength(1);
    expect(result[0].evidencedIn[0].type).toBe("project");
    expect(result[0].evidencedIn[0].label).toBe("Portfolio");
  });

  it("handles complex tech symbols (C++, C#, Node.js)", () => {
    const cv = {
      ...defaultCVState,
      skills: ["C++", "C#", "Node.js"],
      experience: [
        {
          company: "Tech",
          role: "Eng",
          startDate: "2020",
          endDate: null,
          description: "I know C++ and C# well. Used Node.js daily.",
        },
      ],
    };
    
    const result = computeSkillEvidence(cv);
    expect(result).toHaveLength(3);
    
    expect(result[0].name).toBe("C++");
    expect(result[0].evidencedIn).toHaveLength(1);
    
    expect(result[1].name).toBe("C#");
    expect(result[1].evidencedIn).toHaveLength(1);
    
    expect(result[2].name).toBe("Node.js");
    expect(result[2].evidencedIn).toHaveLength(1);
  });

  it("does not match substrings incorrectly", () => {
    const cv = {
      ...defaultCVState,
      skills: ["React", "C"],
      experience: [
        {
          company: "Acme",
          role: "Dev",
          startDate: "2020",
          endDate: null,
          // "reaction" contains "react", "Cat" contains "c"
          description: "Had a great reaction to the Cat video.", 
        },
      ],
    };
    
    const result = computeSkillEvidence(cv);
    // React shouldn't match "reaction"
    expect(result[0].name).toBe("React");
    expect(result[0].evidencedIn).toHaveLength(0);
    
    // C shouldn't match "Cat"
    expect(result[1].name).toBe("C");
    expect(result[1].evidencedIn).toHaveLength(0);
  });

  it("aggregates evidence across multiple entries", () => {
    const cv = {
      ...defaultCVState,
      skills: ["TypeScript"],
      experience: [
        {
          company: "A",
          role: "Dev",
          startDate: "2020",
          endDate: null,
          description: "Used TypeScript.",
        },
      ],
      certifications: [
        {
          title: "TypeScript Master",
          issuer: "Acme",
        },
      ],
    };
    
    const result = computeSkillEvidence(cv);
    expect(result[0].name).toBe("TypeScript");
    expect(result[0].evidencedIn).toHaveLength(2);
    expect(result[0].evidencedIn[0].type).toBe("experience");
    expect(result[0].evidencedIn[1].type).toBe("certification");
  });
  
  it("checks tldr fields", () => {
    const cv = {
      ...defaultCVState,
      skills: ["Postgres"],
      experience: [
        {
          company: "A",
          role: "Dev",
          startDate: "2020",
          endDate: null,
          description: "No DB mentioned here.",
          tldr: "Built backend with PostgreSQL",
        },
      ],
    };
    
    const result = computeSkillEvidence(cv);
    expect(result[0].name).toBe("Postgres");
    expect(result[0].evidencedIn).toHaveLength(1);
  });
});
