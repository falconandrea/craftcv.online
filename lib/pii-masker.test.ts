import { describe, it, expect } from "vitest";
import { maskPii } from "./pii-masker";
import { buildQuickReference, toPromptString } from "@/lib/cv/quick-reference";
import { defaultCVState, type CVState } from "@/state/types";

function cvWithPhone(): CVState {
  return {
    ...defaultCVState,
    personalInfo: {
      ...defaultCVState.personalInfo,
      fullName: "Mario Rossi",
      location: "Milan, Italy",
      email: "mario.rossi@gmail.com",
      phone: "+39 333 123 4567",
      timezone: "CET (UTC+1)",
      links: ["https://github.com/mariorossi", "https://linkedin.com/in/mariorossi"],
    },
    summary: "Backend engineer.",
  };
}

describe("maskPii — phone privacy", () => {
  it("replaces the phone number with a descriptive placeholder", () => {
    const masked = maskPii(cvWithPhone());
    expect(masked.personalInfo.phone).toBe("[PHONE]");
    expect(JSON.stringify(masked)).not.toContain("+39 333 123 4567");
  });

  it("masks phone even when legacy state hydrated it as undefined", () => {
    const legacy = {
      ...cvWithPhone(),
      personalInfo: { ...cvWithPhone().personalInfo, phone: undefined },
    } as unknown as CVState;
    const masked = maskPii(legacy);
    expect(masked.personalInfo.phone).toBe("[PHONE]");
  });

  it("does not mutate the source CV object", () => {
    const cv = cvWithPhone();
    maskPii(cv);
    expect(cv.personalInfo.phone).toBe("+39 333 123 4567");
    expect(cv.personalInfo.fullName).toBe("Mario Rossi");
    expect(cv.personalInfo.links).toEqual([
      "https://github.com/mariorossi",
      "https://linkedin.com/in/mariorossi",
    ]);
  });

  it("still masks the pre-existing PII fields", () => {
    const masked = maskPii(cvWithPhone());
    expect(masked.personalInfo.fullName).toBe("[CANDIDATE NAME]");
    expect(masked.personalInfo.email).toBe("[EMAIL]");
    expect(masked.personalInfo.links).toEqual(["[LINK]", "[LINK]"]);
  });
});

describe("quick-reference prompt context", () => {
  it("never includes the phone number in the AI snapshot", () => {
    const prompt = toPromptString(buildQuickReference(cvWithPhone()));
    expect(prompt).not.toContain("+39 333 123 4567");
    expect(prompt).not.toContain("333 123");
  });
});
