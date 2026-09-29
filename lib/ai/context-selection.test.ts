import { describe, it, expect } from "vitest";
import type { CVState } from "@/state/types";
import { selectContextDetail, buildCvContext } from "./context-selection";
import { defaultCVState } from "@/state/types";

const cv: CVState = {
  ...defaultCVState,
  experience: [
    {
      company: "Acme Corp",
      role: "Senior Developer",
      startDate: "2021",
      endDate: null,
      description: "• Built platform services",
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
  ],
  certifications: [],
};

describe("selectContextDetail — whole-CV review intent", () => {
  it.each([
    "can you review my cv please",
    "Please give me an overall review of my resume",
    "what do you think of my cv?",
    "I want a full review of my curriculum",
    "improve my cv",
    "translate my cv to English",
    "rivedi il mio cv",
    "puoi fare una revisione completa del curriculum?",
    "che ne pensi del mio curriculum?",
    "migliora il mio cv",
    "controlla il curriculum per favore",
    "dammi un parere sul mio cv",
  ])("%s → whole-cv", message => {
    expect(selectContextDetail(message, cv).mode).toBe("whole-cv");
  });
});

describe("selectContextDetail — targeted requests", () => {
  it("entity match takes precedence over review intent (narrow request)", () => {
    const decision = selectContextDetail("what do you think about CraftCV?", cv);
    expect(decision.mode).toBe("targeted");
    if (decision.mode === "targeted") {
      expect(decision.entries).toHaveLength(1);
      expect(decision.entries[0]).toMatchObject({ type: "Project", name: "CraftCV" });
    }
  });

  it("company mention targets the matching experience", () => {
    const decision = selectContextDetail("improve my experience at Acme Corp", cv);
    expect(decision.mode).toBe("targeted");
    if (decision.mode === "targeted") {
      expect(decision.entries).toHaveLength(1);
      expect(decision.entries[0]).toMatchObject({ type: "Experience", company: "Acme Corp" });
    }
  });

  it("section-scoped improvement targets the whole experience section", () => {
    const decision = selectContextDetail("rewrite my bullets", cv);
    expect(decision.mode).toBe("targeted");
    if (decision.mode === "targeted") {
      expect(decision.entries).toHaveLength(2);
      expect(decision.entries.every(e => e.type === "Experience")).toBe(true);
    }
  });

  it("Italian section-scoped improvement targets the experience section", () => {
    const decision = selectContextDetail("migliora le mie esperienze", cv);
    expect(decision.mode).toBe("targeted");
    if (decision.mode === "targeted") {
      expect(decision.entries.every(e => e.type === "Experience")).toBe(true);
      expect(decision.entries).toHaveLength(2);
    }
  });

  it("Italian projects-section request targets the projects section", () => {
    const decision = selectContextDetail("riscrivi i progetti", cv);
    expect(decision.mode).toBe("targeted");
    if (decision.mode === "targeted") {
      expect(decision.entries.every(e => e.type === "Project")).toBe(true);
      expect(decision.entries).toHaveLength(2);
    }
  });
});

describe("selectContextDetail — compact requests (no detail expansion)", () => {
  it.each([
    undefined,
    "",
    "   ",
    "hello",
    "what is ATS?",
    "how many bullets should a cv have?",
    "should i add a projects section?",
    "what is a good project structure?",
    "cos'è un buon progetto side?",
    "quanti anni di esperienza servono?",
  ])("%s → compact", message => {
    expect(selectContextDetail(message, cv).mode).toBe("compact");
  });
});

describe("selectContextDetail — edge cases", () => {
  it("does not throw on empty experience and projects arrays", () => {
    const emptyCv: CVState = { ...defaultCVState };
    expect(() => selectContextDetail("review my cv", emptyCv)).not.toThrow();
    expect(selectContextDetail("review my cv", emptyCv).mode).toBe("whole-cv");
  });

  it("ignores very short entity names to avoid substring false matches", () => {
    const shortNameCv: CVState = {
      ...defaultCVState,
      experience: [
        {
          company: "A",
          role: "Dev",
          startDate: "2020",
          endDate: null,
          description: "",
        },
      ],
    };
    expect(selectContextDetail("what a great day", shortNameCv).mode).toBe("compact");
  });

  it("REGRESSION: entity matching uses full word boundaries — role 'Dev' must not match 'device'", () => {
    const devRoleCv: CVState = {
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
      projects: [],
    };
    // Prefix of an unrelated word: must stay compact
    expect(selectContextDetail("how do i test a device driver?", devRoleCv).mode).toBe("compact");
    // Standalone mention of the role: must target the entry
    expect(selectContextDetail("improve my Dev entry", devRoleCv).mode).toBe("targeted");
  });
});

describe("buildCvContext — route-seam composition", () => {
  it("Italian whole-CV review: snapshot projects + full experience/project detail", () => {
    const context = buildCvContext(cv, "puoi fare una revisione completa del mio cv?");

    // Snapshot evidence: every project name is visible
    expect(context).toContain("[ PROJECTS ]");
    expect(context).toContain("CraftCV");
    expect(context).toContain("OpenRails");
    // Detail evidence: descriptions from experience and projects
    expect(context).toContain("## Full Detail Context");
    expect(context).toContain("• Built platform services");
    expect(context).toContain("• Shipped e-commerce checkout");
    expect(context).toContain("• Full CV builder with ATS scoring");
    expect(context).toContain("• Open-source train scheduling library");
    // Certifications remain genuinely empty (not invented)
    expect(context).not.toContain("[ CERTIFICATIONS ]");
  });

  it("compact request: no full-detail block", () => {
    const context = buildCvContext(cv, "what is ATS?");
    expect(context).toContain("## Current CV Snapshot");
    expect(context).not.toContain("## Full Detail Context");
  });

  it("targeted request: only the mentioned entries are expanded", () => {
    const context = buildCvContext(cv, "improve the OpenRails description");
    expect(context).toContain("## Full Detail Context");
    expect(context).toContain("OpenRails");
    // Acme's evidence stays compact (name-only in snapshot, no description)
    expect(context).not.toContain("• Built platform services");
    expect(context).not.toContain("• Shipped e-commerce checkout");
  });

  it("undefined message falls back to compact snapshot-only context", () => {
    const context = buildCvContext(cv, undefined);
    expect(context).toContain("## Current CV Snapshot");
    expect(context).not.toContain("## Full Detail Context");
  });
});
