import { describe, it, expect, beforeAll } from "vitest";
import { defaultCVState } from "./types";

// Stub localStorage BEFORE importing the store — Zustand persist accesses it
// at module scope and the default Vitest environment is plain Node.
const storageStub = new Map<string, string>();
beforeAll(() => {
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (key: string) => storageStub.get(key) ?? null,
    setItem: (key: string, value: string) => void storageStub.set(key, value),
    removeItem: (key: string) => void storageStub.delete(key),
    clear: () => void storageStub.clear(),
    key: () => null,
    get length() {
      return storageStub.size;
    },
  } as Storage;
});

const { mergePersistedCV, useCVStore } = await import("./store");

describe("mergePersistedCV — backward-compatible contact hydration", () => {
  it("keeps defaults when nothing was persisted (fresh state)", () => {
    const merged = mergePersistedCV(undefined, defaultCVState);
    expect(merged.personalInfo.phone).toBe("");
    expect(merged.personalInfo.timezone).toBe("");
    expect(merged.personalInfo.links).toEqual([]);
  });

  it("hydrates missing phone/timezone as empty strings without losing existing info", () => {
    const persisted = {
      personalInfo: {
        fullName: "Mario Rossi",
        location: "Milan, Italy",
        email: "mario@example.com",
        links: ["https://github.com/mariorossi"],
      },
    };
    const merged = mergePersistedCV(persisted, defaultCVState);
    expect(merged.personalInfo.fullName).toBe("Mario Rossi");
    expect(merged.personalInfo.email).toBe("mario@example.com");
    expect(merged.personalInfo.links).toEqual(["https://github.com/mariorossi"]);
    expect(merged.personalInfo.phone).toBe("");
    expect(merged.personalInfo.timezone).toBe("");
  });

  it("preserves persisted phone and timezone when present", () => {
    const persisted = {
      personalInfo: {
        phone: "+39 333 123 4567",
      },
    };
    const merged = mergePersistedCV(persisted, defaultCVState);
    expect(merged.personalInfo.phone).toBe("+39 333 123 4567");
    expect(merged.personalInfo.timezone).toBe("");

    const mergedBoth = mergePersistedCV(
      { personalInfo: { phone: "+39 333 123 4567", timezone: "CET (UTC+1)" } },
      defaultCVState,
    );
    expect(mergedBoth.personalInfo.phone).toBe("+39 333 123 4567");
    expect(mergedBoth.personalInfo.timezone).toBe("CET (UTC+1)");
  });

  it("lets persisted top-level data override defaults", () => {
    const merged = mergePersistedCV({ summary: "Persisted summary" }, defaultCVState);
    expect(merged.summary).toBe("Persisted summary");
  });
});

describe("CV store reset", () => {
  it("restores empty phone and timezone values", () => {
    useCVStore.getState().setPersonalInfo({
      ...defaultCVState.personalInfo,
      fullName: "Mario Rossi",
      phone: "+39 333 123 4567",
      timezone: "CET (UTC+1)",
    });
    useCVStore.getState().resetCV();
    const state = useCVStore.getState();
    expect(state.personalInfo.phone).toBe("");
    expect(state.personalInfo.timezone).toBe("");
    expect(state.personalInfo.fullName).toBe("");
  });
});
