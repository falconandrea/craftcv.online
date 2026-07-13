import { describe, it, expect } from "vitest";
import { parseModelResponse, findFirstJsonObject } from "./parse-model-response";

describe("findFirstJsonObject — balanced brace matching", () => {
    it("returns the JSON object when text is just the object", () => {
        expect(findFirstJsonObject('{"a":1}')).toBe('{"a":1}');
    });

    it("returns null when there is no JSON object", () => {
        expect(findFirstJsonObject("no json here")).toBeNull();
        expect(findFirstJsonObject("")).toBeNull();
    });

    it("skips a garbage prefix before the actual object", () => {
        expect(findFirstJsonObject('garbage{"a":1}')).toBe('{"a":1}');
    });

    it("REGRESSION: handles the '#start#' prefill artifact from DeepSeek", () => {
        // Real production case: model emitted `#start#\n{...}` after the
        // prefill `{`. Naive greedy regex would grab from the first `{` and
        // fail to parse. Balanced matching skips the artifact and finds the
        // real object.
        const raw = `{#start#\n{\n  "message": "hi",\n  "proposedChanges": { "experience": [] }\n}`;
        expect(findFirstJsonObject(raw)).toBe(
            `{\n  "message": "hi",\n  "proposedChanges": { "experience": [] }\n}`
        );
    });

    it("does not confuse braces inside string literals", () => {
        // The `{` and `}` inside the string value must not affect depth counting.
        const raw = '{"template": "use {name} here"}';
        expect(findFirstJsonObject(raw)).toBe(raw);
    });

    it("does not confuse escaped quotes inside strings", () => {
        const raw = '{"text": "she said \\"hi {name}\\""}';
        expect(findFirstJsonObject(raw)).toBe(raw);
    });

    it("handles nested objects", () => {
        const raw = '{"outer": {"inner": {"deep": true}}}';
        expect(findFirstJsonObject(raw)).toBe(raw);
    });

    it("moves on if the first balanced candidate is invalid JSON", () => {
        // First `{...}` is balanced but invalid (trailing comma); the parser
        // should try the second `{...}` which is valid.
        const raw = '{ "a": 1, } prefix {"b": 2}';
        expect(findFirstJsonObject(raw)).toBe('{"b": 2}');
    });
});

describe("parseModelResponse", () => {
    it("parses a clean direct JSON response", () => {
        const raw = JSON.stringify({ message: "hi", proposedChanges: { summary: "new" } });
        const parsed = parseModelResponse(raw);
        expect(parsed.message).toBe("hi");
        expect(parsed.proposedChanges).toEqual({ summary: "new" });
    });

    it("parses JSON wrapped in markdown code fences", () => {
        const raw = '```json\n{"message":"hi"}\n```';
        const parsed = parseModelResponse(raw);
        expect(parsed.message).toBe("hi");
        expect(parsed.proposedChanges).toBeUndefined();
    });

    it("REGRESSION: parses the real DeepSeek response with '{#start#' prefix", () => {
        // Exact shape of the production response that was breaking.
        const raw = `{#start#\n{\n  "message": "I've improved your first experience.",\n  "proposedChanges": {\n    "experience": [\n      {\n        "company": "Acme",\n        "role": "Dev",\n        "description": "• Built things"\n      }\n    ]\n  }\n}`;
        const parsed = parseModelResponse(raw);
        expect(parsed.message).toBe("I've improved your first experience.");
        expect(parsed.proposedChanges).toBeDefined();
        expect((parsed.proposedChanges as { experience: unknown[] }).experience).toHaveLength(1);
    });

    it("REGRESSION: parses responses that echo the chat transcript", () => {
        // The "{# Human:" failure mode: model regurgitates the input.
        // We should still extract the JSON if it's in there.
        const raw = `{# Human:\nfoo\n\nREMINDER: output JSON\n\n{"message":"ok","proposedChanges":{}}`;
        const parsed = parseModelResponse(raw);
        expect(parsed.message).toBe("ok");
    });

    it("falls back to treating plain text as a message", () => {
        const parsed = parseModelResponse("Just a conversational reply, no JSON.");
        expect(parsed.message).toBe("Just a conversational reply, no JSON.");
        expect(parsed.proposedChanges).toBeUndefined();
    });

    it("returns empty message for empty input", () => {
        expect(parseModelResponse("")).toEqual({ message: "" });
    });

    it("extracts proposedChanges even when message contains braces", () => {
        // The message string contains `{` and `}` — the parser must still
        // find the outer object correctly.
        const raw = JSON.stringify({
            message: "I replaced {old} with {new}",
            proposedChanges: { summary: "x" },
        });
        const parsed = parseModelResponse(raw);
        expect(parsed.message).toBe("I replaced {old} with {new}");
        expect(parsed.proposedChanges).toEqual({ summary: "x" });
    });
});
