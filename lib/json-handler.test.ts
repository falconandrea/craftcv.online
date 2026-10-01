import { describe, it, expect } from "vitest";
import { importCVFromJSON, normalizeCVState } from "./json-handler";
import { defaultCVState, type CVState } from "@/state/types";

function legacyCV(): CVState {
  return {
    ...defaultCVState,
    personalInfo: {
      fullName: "Mario Rossi",
      location: "Milan, Italy",
      email: "mario@example.com",
      phone: "",
      timezone: "",
      links: [],
    },
    summary: "Legacy export without phone or timezone.",
  };
}

function cvFile(data: unknown): File {
  return new File([JSON.stringify(data)], "cv-data.json", {
    type: "application/json",
  });
}

describe("normalizeCVState", () => {
  it("fills missing phone/timezone with empty strings on legacy shapes", () => {
    const legacy = {
      ...legacyCV(),
      personalInfo: {
        fullName: "Mario Rossi",
        location: "Milan, Italy",
        email: "mario@example.com",
        links: ["https://github.com/mariorossi"],
      },
    } as unknown as CVState;

    const normalized = normalizeCVState(legacy);
    expect(normalized.personalInfo.phone).toBe("");
    expect(normalized.personalInfo.timezone).toBe("");
    expect(normalized.personalInfo.fullName).toBe("Mario Rossi");
    expect(normalized.personalInfo.links).toEqual(["https://github.com/mariorossi"]);
  });

  it("preserves phone and timezone from new exports", () => {
    const modern = {
      ...legacyCV(),
      personalInfo: {
        ...legacyCV().personalInfo,
        phone: "+39 333 123 4567",
        timezone: "CET (UTC+1)",
      },
    };

    const normalized = normalizeCVState(modern);
    expect(normalized.personalInfo.phone).toBe("+39 333 123 4567");
    expect(normalized.personalInfo.timezone).toBe("CET (UTC+1)");
  });

  it("normalizes imported link destinations", () => {
    const cv = {
      ...legacyCV(),
      personalInfo: {
        ...legacyCV().personalInfo,
        links: ["mariorossi", "mariorossi.dev", "  "],
      },
    };

    const normalized = normalizeCVState(cv);
    expect(normalized.personalInfo.links).toEqual([
      "https://github.com/mariorossi",
      "https://mariorossi.dev",
    ]);
  });
});

describe("importCVFromJSON", () => {
  it("imports legacy JSON without phone/timezone and resolves them to empty strings", async () => {
    const legacy = {
      ...legacyCV(),
      personalInfo: {
        fullName: "Mario Rossi",
        location: "Milan, Italy",
        email: "mario@example.com",
        links: ["https://github.com/mariorossi"],
      },
    };

    let received: CVState | undefined;
    await importCVFromJSON(cvFile(legacy), (data) => {
      received = data;
    });

    expect(received).toBeDefined();
    expect(received!.personalInfo.fullName).toBe("Mario Rossi");
    expect(received!.personalInfo.phone).toBe("");
    expect(received!.personalInfo.timezone).toBe("");
    expect(received!.personalInfo.links).toEqual(["https://github.com/mariorossi"]);
  });

  it("imports JSON without personalInfo at all, normalizing empty contacts", async () => {
    const withoutContacts = {
      ...legacyCV(),
      personalInfo: undefined,
    };

    let received: CVState | undefined;
    await importCVFromJSON(cvFile(withoutContacts), (data) => {
      received = data;
    });

    expect(received).toBeDefined();
    expect(received!.personalInfo).toEqual({
      fullName: "",
      location: "",
      email: "",
      phone: "",
      timezone: "",
      links: [],
    });
    // Otherwise valid CV data is not discarded
    expect(received!.summary).toBe("Legacy export without phone or timezone.");
  });

  it("imports JSON whose personalInfo lacks a links array", async () => {
    const noLinks = {
      ...legacyCV(),
      personalInfo: {
        fullName: "Mario Rossi",
        email: "mario@example.com",
      },
    };

    let received: CVState | undefined;
    await importCVFromJSON(cvFile(noLinks), (data) => {
      received = data;
    });

    expect(received!.personalInfo.links).toEqual([]);
    expect(received!.personalInfo.fullName).toBe("Mario Rossi");
    expect(received!.personalInfo.location).toBe("");
  });

  it("rejects personalInfo with a malformed explicit type", async () => {
    const malformed = { ...legacyCV(), personalInfo: "nope" };
    await expect(
      importCVFromJSON(cvFile(malformed), () => {}),
    ).rejects.toThrow(/Invalid CV data structure/);

    const nullInfo = { ...legacyCV(), personalInfo: null };
    await expect(
      importCVFromJSON(cvFile(nullInfo), () => {}),
    ).rejects.toThrow(/Invalid CV data structure/);
  });

  it("imports new JSON preserving phone and timezone", async () => {
    const modern = {
      ...legacyCV(),
      personalInfo: {
        ...legacyCV().personalInfo,
        phone: "+39 333 123 4567",
        timezone: "CET (UTC+1)",
      },
    };

    let received: CVState | undefined;
    await importCVFromJSON(cvFile(modern), (data) => {
      received = data;
    });

    expect(received!.personalInfo.phone).toBe("+39 333 123 4567");
    expect(received!.personalInfo.timezone).toBe("CET (UTC+1)");
  });

  it("rejects files with an invalid CV structure", async () => {
    await expect(
      importCVFromJSON(cvFile({ hello: "world" }), () => {}),
    ).rejects.toThrow(/Invalid CV data structure/);
  });

  it("rejects malformed JSON with a syntax error message", async () => {
    const badFile = new File(["{not json"], "cv.json", { type: "application/json" });
    await expect(
      importCVFromJSON(badFile, () => {}),
    ).rejects.toThrow(/Invalid JSON file/);
  });
});
