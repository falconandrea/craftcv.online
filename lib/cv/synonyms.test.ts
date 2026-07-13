import { describe, it, expect } from "vitest";
import { normalize, areSynonyms, getAliases } from "./synonyms";

describe("normalize", () => {
  it("resolves JS → js (canonical)", () => {
    expect(normalize("JS")).toBe("js");
  });

  it("resolves JavaScript → js (canonical)", () => {
    expect(normalize("JavaScript")).toBe("js");
  });

  it("resolves TypeScript → ts", () => {
    expect(normalize("TypeScript")).toBe("ts");
  });

  it("is case-insensitive", () => {
    expect(normalize("GOLANG")).toBe(normalize("Go"));
    expect(normalize("PostgreSQL")).toBe(normalize("postgres"));
  });

  it("returns lowercased input for unknown terms", () => {
    expect(normalize("Svelte")).toBe("svelte");
    expect(normalize("HTMX")).toBe("htmx");
  });

  it("handles whitespace", () => {
    expect(normalize("  Node  ")).toBe("node");
  });

  it("resolves cloud abbreviations", () => {
    expect(normalize("AWS")).toBe("aws");
    expect(normalize("Amazon Web Services")).toBe("aws");
    expect(normalize("k8s")).toBe("k8s");
    expect(normalize("Kubernetes")).toBe("k8s");
  });

  it("resolves AI/ML abbreviations", () => {
    expect(normalize("ML")).toBe("ml");
    expect(normalize("Machine Learning")).toBe("ml");
  });
});

describe("areSynonyms", () => {
  it("returns true for known pairs", () => {
    expect(areSynonyms("JS", "JavaScript")).toBe(true);
    expect(areSynonyms("Postgres", "PostgreSQL")).toBe(true);
    expect(areSynonyms("k8s", "Kubernetes")).toBe(true);
    expect(areSynonyms("golang", "Go")).toBe(true);
  });

  it("is bidirectional", () => {
    expect(areSynonyms("JavaScript", "JS")).toBe(true);
    expect(areSynonyms("PostgreSQL", "Postgres")).toBe(true);
  });

  it("returns false for unrelated terms", () => {
    expect(areSynonyms("React", "Vue")).toBe(false);
    expect(areSynonyms("Python", "Go")).toBe(false);
  });

  it("returns true for same term", () => {
    expect(areSynonyms("React", "React")).toBe(true);
  });
});

describe("getAliases", () => {
  it("returns all aliases for a known term", () => {
    const aliases = getAliases("JS");
    expect(aliases).toContain("js");
    expect(aliases).toContain("javascript");
  });

  it("returns single-element array for unknown terms", () => {
    const aliases = getAliases("Svelte");
    expect(aliases).toEqual(["svelte"]);
  });

  it("always includes the canonical form", () => {
    const aliases = getAliases("PostgreSQL");
    expect(aliases[0]).toBe("postgres");
  });
});
