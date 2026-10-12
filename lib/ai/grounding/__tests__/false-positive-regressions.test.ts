/**
 * Regression tests for grounding false positives reported in the manual
 * OpenRouter test (2026-10-11).
 *
 * Legitimate proposals were flagged as invented entities:
 * "In", "Integrated", "Handled", "Sviluppo", "Bacheca", "Catalogo",
 * "Presso", "Studio", "Interfacce", "Progettato".
 *
 * Root classes:
 * 1. Bullet/sentence-initial words (verbs, prepositions) are capitalized by
 *    orthography, not because they are entities.
 * 2. Words present in the CV with different casing ("bacheca", "catalogo" in
 *    project descriptions) were compared against a capitalized-only extraction
 *    of the original field.
 * 3. Component words of multi-word CV entities ("Studio Interfacce Demo"
 *    company) never matched the whole-phrase vocabulary entry.
 *
 * These tests run the real validatePatch against the real synthetic fixture
 * (cv-test-openrouter.json) and must stay green while still flagging truly
 * absent technologies (Kubernetes, Docker).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CVState, CVPatch } from "@/state/types";
import { validatePatch } from "../validate-patch";

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dir, "..", "..", "..", "..");
const cv = JSON.parse(
  readFileSync(path.join(repoRoot, "cv-test-openrouter.json"), "utf-8")
) as unknown as CVState;

function flaggedTerms(patch: CVPatch): string[] {
  const { report } = validatePatch(patch, cv);
  return report.flaggedInventions.map((f) => f.term);
}

describe("grounding false positives (manual OpenRouter test regressions)", () => {
  it("does not flag Italian bullet-initial verbs/prepositions (Sviluppo, In, Presso, Progettato)", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Sviluppo di interfacce React e TypeScript per il portale interno di gestione delle richieste.\n" +
          "• In collaborazione con il designer per adattare le schermate a dispositivi mobili.\n" +
          "• Presso Studio Interfacce Demo ho curato componenti riutilizzabili.\n" +
          "• Progettato moduli con validazione dei dati e messaggi di errore.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).not.toContain("Sviluppo");
    expect(terms).not.toContain("In");
    expect(terms).not.toContain("Presso");
    expect(terms).not.toContain("Progettato");
  });

  it("does not flag component words of multi-word CV entities (Studio, Interfacce from the company name)", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Presso Studio Interfacce Demo ho sviluppato interfacce React e TypeScript per il portale interno.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).not.toContain("Studio");
    expect(terms).not.toContain("Interfacce");
    expect(terms).not.toContain("Demo");
  });

  it("does not flag CV words whose casing changed (Bacheca, Catalogo from project descriptions)", () => {
    const patch: CVPatch = {
      projects: [
        {
          ...cv.projects[0],
          description: "• Bacheca delle attività con creazione, modifica e filtro.",
        },
        {
          ...cv.projects[1],
          description: "• Catalogo dei libri con ricerca per titolo e filtro per autore.",
        },
      ],
    };
    const terms = flaggedTerms(patch);
    expect(terms).not.toContain("Bacheca");
    expect(terms).not.toContain("Catalogo");
  });

  it("does not flag English bullet-initial CV verbs (Integrated, Handled)", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Integrated REST APIs with loading states and network error handling.\n" +
          "• Handled data validation and error messages in form modules.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).not.toContain("Integrated");
    expect(terms).not.toContain("Handled");
  });

  it("still flags technologies truly absent from the CV (Kubernetes, Docker)", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Sviluppati componenti con Kubernetes e Docker per la pubblicazione del portale.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).toContain("Kubernetes");
    expect(terms).toContain("Docker");
  });

  it("still flags absent technologies in English rewrites mid-sentence", () => {
    const patch: CVPatch = {
      projects: [{
        ...cv.projects[0],
        description: "• Built the task board with React and deployed it using Kubernetes.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).toContain("Kubernetes");
  });

  it("REGRESSION (review): flags absent technologies as the FIRST word of a bullet or sentence", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Kubernetes e Docker per la pubblicazione del portale interno.\n" +
          "• React e TypeScript per le interfacce.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).toContain("Kubernetes");
    expect(terms).toContain("Docker");
  });

  it("REGRESSION (review): flags absent technology as first word of a summary sentence", () => {
    const patch: CVPatch = {
      summary: "Kubernetes orchestration experience. Sviluppatore frontend con React.",
    };
    const terms = flaggedTerms(patch);
    expect(terms).toContain("Kubernetes");
  });

  it("REGRESSION (review): flags hyphenated absent tech at bullet start (Docker-based)", () => {
    const patch: CVPatch = {
      projects: [{
        ...cv.projects[0],
        description: "• Docker-based publishing pipeline per la bacheca delle attività.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms.some((t) => t.startsWith("Docker"))).toBe(true);
  });

  it("does not reintroduce verb false positives at bullet start after the first-word fix", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Sviluppo di interfacce React e TypeScript per il portale interno.\n" +
          "• Progettare componenti riutilizzabili con validazione dei dati.\n" +
          "• Sviluppando moduli per la gestione delle richieste.\n" +
          "• Managing the component library backlog.\n" +
          "• Well-designed components for the internal portal.\n" +
          "• Realizzate interfacce accessibili da tastiera.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).not.toContain("Sviluppo");
    expect(terms).not.toContain("Progettare");
    expect(terms).not.toContain("Sviluppando");
    expect(terms).not.toContain("Managing");
    expect(terms).not.toContain("Well-designed");
    expect(terms).not.toContain("Realizzate");
  });

  it("REGRESSION (review): matches tech-name variants across separators (Node.js in CV, NodeJS proposed)", () => {
    // Node.js appears only in the experience description (not in skills), so
    // the vocabulary cannot ground it — the whole-CV corpus must.
    const cvWithNode = {
      ...cv,
      experience: [{
        ...cv.experience[0],
        description: "• Costruiti servizi Node.js per il portale interno.",
      }],
    } as unknown as CVState;
    const { report } = validatePatch(
      {
        experience: [{
          ...cvWithNode.experience[0],
          description: "• Sviluppati componenti riutilizzabili in NodeJS per il portale.",
        }],
      } as CVPatch,
      cvWithNode,
    );
    expect(report.flaggedInventions.map((f) => f.term)).not.toContain("NodeJS");
  });

  it("REGRESSION (review): matches tech-name variants in the reverse direction (NodeJS in CV, Node.js proposed)", () => {
    const cvWithNode = {
      ...cv,
      projects: [{
        ...cv.projects[0],
        description: "• Bacheca delle attività realizzata in NodeJS e React.",
      }],
    } as unknown as CVState;
    const { report } = validatePatch(
      {
        projects: [{
          ...cvWithNode.projects[0],
          description: "• Bacheca delle attività realizzata in Node.js e React.",
        }],
      } as CVPatch,
      cvWithNode,
    );
    expect(report.flaggedInventions.map((f) => f.term)).not.toContain("Node.js");
  });

  it("REGRESSION (review r3): flags Hibernate, Firestore and Teradata at bullet start", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Hibernate per la mappatura oggetti-relazionale.\n" +
          "• Firestore come database in tempo reale.\n" +
          "• Teradata per le analisi dei dati di vendita.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).toContain("Hibernate");
    expect(terms).toContain("Firestore");
    expect(terms).toContain("Teradata");
  });

  it("keeps suppressing common Italian verb forms at bullet start (participles, infinitives, gerunds)", () => {
    const patch: CVPatch = {
      experience: [{
        ...cv.experience[0],
        description:
          "• Progettato moduli con validazione dei dati.\n" +
          "• Realizzate interfacce accessibili da tastiera.\n" +
          "• Gestita la bacheca delle attività.\n" +
          "• Sviluppare componenti riutilizzabili per il portale.\n" +
          "• Utilizzando React e TypeScript per le viste.\n" +
          "• Integrato il catalogo con le API REST.",
      }],
    };
    const terms = flaggedTerms(patch);
    expect(terms).not.toContain("Progettato");
    expect(terms).not.toContain("Realizzate");
    expect(terms).not.toContain("Gestita");
    expect(terms).not.toContain("Sviluppare");
    expect(terms).not.toContain("Utilizzando");
    expect(terms).not.toContain("Integrato");
  });

  it("REGRESSION (review r3): keeps C++ and C# present only in descriptions without flags", () => {
    const cvWithC = {
      ...cv,
      experience: [{
        ...cv.experience[0],
        description: "• Sviluppati moduli C++ e interfacce C# per il portale desktop.",
      }],
    } as unknown as CVState;
    const { report } = validatePatch(
      {
        experience: [{
          ...cvWithC.experience[0],
          description: "• Sviluppati moduli C++ e interfacce C# per il portale desktop interno.",
        }],
      } as CVPatch,
      cvWithC,
    );
    const terms = report.flaggedInventions.map((f) => f.term);
    expect(terms).not.toContain("C++");
    expect(terms).not.toContain("C#");
  });

  it("REGRESSION (review r3): does not conflate distinct C-family technologies", () => {
    // CV knows C# only; a rewrite that introduces C++ must still be flagged.
    const cvWithCSharp = {
      ...cv,
      experience: [{
        ...cv.experience[0],
        description: "• Sviluppate interfacce C# per il portale desktop.",
      }],
    } as unknown as CVState;
    const { report } = validatePatch(
      {
        experience: [{
          ...cvWithCSharp.experience[0],
          description: "• Sviluppati moduli C++ e interfacce C# per il portale.",
        }],
      } as CVPatch,
      cvWithCSharp,
    );
    expect(report.flaggedInventions.map((f) => f.term)).toContain("C++");
  });
});
