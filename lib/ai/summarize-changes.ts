/**
 * Summarize Changes
 *
 * Generates a human-readable bullet list from a CVPatch, listing ONLY the
 * items that actually differ from the user's current CV.
 *
 * Why per-item filtering matters: the AI Optimize prompt instructs the LLM
 * to return the ENTIRE array for any modified section (e.g. all experience
 * entries even when only one was edited). Listing every returned item would
 * mislead the user into thinking everything was modified. We compare item by
 * item with deep equality and surface only real changes.
 */

import type { CVState, CVPatch } from "@/state/types";

/** Deep equality via canonical JSON. Sufficient for plain CV data (no Dates/Functions). */
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Builds the bullet-point summary shown in the PROPOSED_CHANGES panel.
 *
 * @param patch      the (already effective-filtered) patch from the LLM
 * @param currentCV  the user's live CV state, used to detect per-item changes
 * @returns human-readable change lines, one per actually-modified item
 */
export function summarizeChanges(patch: CVPatch, currentCV: CVState): string[] {
    const lines: string[] = [];

    if (patch.summary !== undefined && !same(patch.summary, currentCV.summary)) {
        lines.push("📝 Summary updated");
    }
    if (patch.skills !== undefined && !same(patch.skills, currentCV.skills)) {
        const count = patch.skills.length;
        lines.push(`🛠️ Skills: ${count} item${count !== 1 ? "s" : ""} (${patch.skills.slice(0, 3).join(", ")}${count > 3 ? "…" : ""})`);
    }
    if (patch.experience !== undefined) {
        patch.experience.forEach((e, i) => {
            // Only list entries that actually differ from the corresponding current CV entry.
            // The LLM is instructed to return the full array even when only one entry changed;
            // listing unchanged entries misleads the user into thinking everything was modified.
            if (!same(e, currentCV.experience[i])) {
                lines.push(`💼 Experience: "${e.role}" at ${e.company}`);
            }
        });
    }
    if (patch.education !== undefined) {
        patch.education.forEach((e, i) => {
            if (!same(e, currentCV.education[i])) {
                lines.push(`🎓 Education: "${e.degree}" – ${e.institution}`);
            }
        });
    }
    if (patch.certifications !== undefined) {
        patch.certifications.forEach((c, i) => {
            if (!same(c, currentCV.certifications[i])) {
                lines.push(`🏅 Certification: "${c.title}" by ${c.issuer}`);
            }
        });
    }
    if (patch.projects !== undefined) {
        patch.projects.forEach((p, i) => {
            if (!same(p, currentCV.projects[i])) {
                lines.push(`🚀 Project: "${p.name}"`);
            }
        });
    }
    if (patch.languages !== undefined && !same(patch.languages, currentCV.languages)) {
        const langs = patch.languages.map((l) => `${l.language} (${l.proficiency})`).join(", ");
        lines.push(`🌐 Languages: ${langs}`);
    }
    if (patch.customSection !== undefined && !same(patch.customSection, currentCV.customSection)) {
        lines.push(`✏️ Custom Section: "${patch.customSection.title}"`);
    }

    return lines;
}
