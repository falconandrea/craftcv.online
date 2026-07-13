/**
 * Model Response Parser
 *
 * Robust JSON extraction from LLM responses. Handles the messy reality of
 * non-OpenAI providers (DeepSeek, Llama, Mistral, etc.) accessed via
 * OpenAI-compatible proxies:
 *
 *   - Direct JSON output (ideal case)
 *   - JSON wrapped in markdown code fences (```json ... ```)
 *   - Garbage prefixes before the actual JSON
 *     (e.g. "#start\\n{...}" when chat templates leak, or "{#start#\\n{...}"
 *     when a prefill trick goes wrong)
 *   - Plain conversational text with no JSON at all
 *
 * The previous regex-based parser used `\\{[\\s\\S]*\\}` (greedy first-to-last
 * brace), which fails when there's an extra `{` in a garbage prefix — the
 * greedy match grabs from the wrong brace. We replace it with balanced brace
 * matching that tries every `{` position and returns the first slice that
 * parses as valid JSON.
 */

export interface ParsedModelResponse {
    message?: string;
    proposedChanges?: object;
}

/**
 * Extracts the first valid JSON object string from `text` using balanced
 * brace matching. Respects string literals and escape sequences so braces
 * inside JSON string values don't confuse the depth counter.
 *
 * Iterates `{` positions left-to-right; returns the first slice whose
 * balanced content parses successfully. Returns null if no valid object
 * is found.
 *
 * Examples:
 *   findFirstJsonObject('{"a":1}')             -> '{"a":1}'
 *   findFirstJsonObject('garbage{"a":1}')      -> '{"a":1}'
 *   findFirstJsonObject('{#start#\n{"a":1}')   -> '{"a":1}'   (prefill artifact case)
 *   findFirstJsonObject('no json here')        -> null
 */
export function findFirstJsonObject(text: string): string | null {
    for (let i = 0; i < text.length; i++) {
        if (text[i] !== "{") continue;

        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let j = i; j < text.length; j++) {
            const c = text[j];

            if (escaped) { escaped = false; continue; }
            if (c === "\\") { escaped = true; continue; }
            if (c === '"') { inString = !inString; continue; }
            if (inString) continue;

            if (c === "{") {
                depth++;
            } else if (c === "}") {
                depth--;
                if (depth === 0) {
                    const candidate = text.slice(i, j + 1);
                    try {
                        JSON.parse(candidate);
                        return candidate;
                    } catch {
                        // Balanced but invalid JSON (e.g. trailing comma).
                        // Move on to the next `{` and try again.
                        break;
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Parses a raw LLM response into a structured `{ message, proposedChanges }`.
 *
 * Strategies, tried in order:
 *   1. Direct `JSON.parse` (ideal case — model returned clean JSON)
 *   2. Strip markdown code fences and parse the inner content
 *   3. Balanced brace matching to extract the first valid JSON object
 *      (handles garbage prefixes like "#start#" or prefill artifacts)
 *   4. Fallback: treat the whole response as a conversational message
 */
export function parseModelResponse(raw: string): ParsedModelResponse {
    if (!raw) return { message: "" };

    // 1. Direct parse (ideal)
    try { return JSON.parse(raw); } catch { /* fall through */ }

    // 2. Strip markdown code fences ```json ... ```
    const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
        try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
    }

    // 3. Balanced brace matching (handles prefixes like "#start#" and prefill artifacts)
    const extracted = findFirstJsonObject(raw);
    if (extracted) {
        try { return JSON.parse(extracted); } catch { /* fall through */ }
    }

    // 4. Fallback — treat as plain message
    return { message: raw };
}
