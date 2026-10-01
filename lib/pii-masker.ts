import type { CVState } from "@/state/types";

/**
 * Masks PII fields in CV data before sending to the LLM.
 * Returns a deep copy — the original store data is never mutated.
 */
export function maskPii(cvData: CVState): CVState {
    const masked = structuredClone(cvData);

    masked.personalInfo = {
        ...masked.personalInfo,
        fullName: "[CANDIDATE NAME]",
        email: "[EMAIL]",
        phone: "[PHONE]",
        links: masked.personalInfo.links.map(() => "[LINK]"),
    };

    return masked;
}
