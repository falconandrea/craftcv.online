import { describe, it, expect } from "vitest";
import type { CVState, CVPatch } from "@/state/types";
import { summarizeChanges } from "./summarize-changes";

/**
 * Minimal but representative CV used across tests.
 * Three experience entries — mirrors the real-world bug pattern where the LLM
 * returns all three even when only the first was edited.
 * NOTE: all names below are fictional test fixtures, not real employer data.
 */
function makeCv(): CVState {
    return {
        personalInfo: { fullName: "Ada", location: "IT", email: "a@b.c", links: [] },
        summary: "Original summary.",
        experience: [
            {
                company: "Acme Corp",
                role: "Backend Developer",
                startDate: "2019-02",
                endDate: null,
                location: "Springfield",
                description: "• Original bullet one\n• Original bullet two",
                tldr: "Backend dev at Acme.",
            },
            {
                company: "Globex",
                role: "FullStack Developer",
                startDate: "2014-06",
                endDate: "2019-02",
                location: "Springfield",
                description: "• Built things",
                tldr: "Full-stack at Globex.",
            },
            {
                company: "Initech",
                role: "Intern",
                startDate: "2013-05",
                endDate: "2014-06",
                location: "Springfield",
                description: "• HTML/CSS",
                tldr: "Internship at Initech.",
            },
        ],
        education: [
            { degree: "BSc", institution: "Uni", location: "IT", year: "2013" },
        ],
        certifications: [],
        projects: [],
        skills: ["Laravel", "Vue", "Node.js"],
        languages: [{ language: "English", proficiency: "Fluent" }],
        customSection: { title: "Interests", content: "" },
        cvLanguage: "en",
    } as unknown as CVState;
}

describe("summarizeChanges — per-item filtering", () => {
    it("returns no lines for an empty patch", () => {
        expect(summarizeChanges({}, makeCv())).toEqual([]);
    });

    it("REGRESSION: full experience array with only one edited entry lists only that entry", () => {
        // Bug pattern: LLM returns all 3 experience entries (per the prompt's
        // "return the ENTIRE array" instruction), but only the first was actually modified.
        const cv = makeCv();
        const editedFirst = {
            ...cv.experience[0],
            description: "• Improved bullet with stronger action verb\n• Added quantified metric",
        };
        const patch: CVPatch = {
            experience: [editedFirst, cv.experience[1], cv.experience[2]],
        };

        const lines = summarizeChanges(patch, cv);

        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("Acme Corp");
        expect(lines[0]).not.toContain("Globex");
        expect(lines[0]).not.toContain("Initech");
    });

    it("lists all entries when ALL of them actually differ (e.g. AI added TLDRs everywhere)", () => {
        const cv = makeCv();
        const patch: CVPatch = {
            experience: cv.experience.map((e) => ({ ...e, tldr: "AI-generated TLDR." })),
        };

        const lines = summarizeChanges(patch, cv);
        expect(lines).toHaveLength(3);
    });

    it("lists nothing when the returned experience array is byte-identical to the current CV", () => {
        const cv = makeCv();
        const patch: CVPatch = { experience: cv.experience.map((e) => ({ ...e })) };

        expect(summarizeChanges(patch, cv)).toEqual([]);
    });

    it("does not crash if the patch has fewer entries than the CV (partial array)", () => {
        const cv = makeCv();
        // LLM returned only one entry — different from CV[0], should still be detected.
        const patch: CVPatch = {
            experience: [{ ...cv.experience[0], description: "• Different content" }],
        };

        const lines = summarizeChanges(patch, cv);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("Acme Corp");
    });

    it("handles a modified TLDR-only change on an otherwise-identical entry", () => {
        const cv = makeCv();
        const patch: CVPatch = {
            experience: [
                { ...cv.experience[0], tldr: "Rewritten TLDR only." },
                cv.experience[1],
                cv.experience[2],
            ],
        };

        const lines = summarizeChanges(patch, cv);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("Acme Corp");
    });
});

describe("summarizeChanges — scalar sections", () => {
    it("lists summary only when it actually differs", () => {
        const cv = makeCv();
        expect(summarizeChanges({ summary: "Original summary." }, cv)).toEqual([]);
        expect(summarizeChanges({ summary: "New summary!" }, cv)).toEqual(["📝 Summary updated"]);
    });

    it("lists skills only when the array differs", () => {
        const cv = makeCv();
        expect(summarizeChanges({ skills: ["Laravel", "Vue", "Node.js"] }, cv)).toEqual([]);
        const lines = summarizeChanges({ skills: ["Laravel", "Vue", "Node.js", "Docker"] }, cv);
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("Skills");
    });

    it("lists custom section only when title or content differs", () => {
        const cv = makeCv();
        expect(summarizeChanges({ customSection: { title: "Interests", content: "" } }, cv)).toEqual([]);
        expect(summarizeChanges({ customSection: { title: "Hobbies", content: "" } }, cv)).toEqual([
            "✏️ Custom Section: \"Hobbies\"",
        ]);
    });
});

describe("summarizeChanges — mixed patch", () => {
    it("reports multiple actually-changed sections in a single call", () => {
        const cv = makeCv();
        const patch: CVPatch = {
            summary: "New stronger summary.",
            skills: ["Laravel", "Vue", "Node.js", "Docker", "Kubernetes", "AWS"],
            experience: [{ ...cv.experience[0], description: "• New" }, cv.experience[1], cv.experience[2]],
        };

        const lines = summarizeChanges(patch, cv);
        expect(lines).toHaveLength(3);
        expect(lines.some((l) => l.startsWith("📝"))).toBe(true);
        expect(lines.some((l) => l.startsWith("🛠️"))).toBe(true);
        expect(lines.some((l) => l.startsWith("💼"))).toBe(true);
    });
});
