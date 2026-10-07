import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { defaultCVState } from "@/state/types";
import * as parser from "@/lib/ai/parse-model-response";
import * as grounding from "@/lib/ai/grounding/validate-patch";
import { POST } from "@/app/api/ai/optimize/route";
import { resolveOptimizeProvider } from "./config";
import { safeErrorMetadata } from "./types";

const { anthropic, openai, incrementCounter, addToCounter } = vi.hoisted(() => ({
  anthropic: vi.fn(), openai: vi.fn(), incrementCounter: vi.fn(), addToCounter: vi.fn(),
}));
vi.mock("@anthropic-ai/sdk", () => ({ default: class {
  messages = { create: anthropic };
} }));
vi.mock("openai", () => ({ default: class {
  chat = { completions: { create: openai } };
} }));
vi.mock("@/lib/stats", () => ({ incrementCounter, addToCounter }));
const json = JSON.stringify({ message: "Improved summary.", proposedChanges: { summary: "Backend engineer." } });
const history = [{ role: "user" as const, content: "Improve" }, { role: "assistant" as const, content: "What section?" }, { role: "user" as const, content: "Summary" }];
const legacy = { AI_PROVIDER_BASE_URL: "https://provider.example/v1", AI_PROVIDER_API_KEY: "test", AI_PROVIDER_MODEL: "test-model" };
const native = { AI_OPTIMIZE_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test", ANTHROPIC_MODEL: "claude-sonnet-5-5" };
function response(stop_reason: string = "end_turn", content = [{ type: "text", text: json }]) {
  return { stop_reason, content, usage: { input_tokens: 123, output_tokens: 45 } };
}
async function request(messages: unknown = history) {
  return POST(new NextRequest("http://localhost/api/ai/optimize", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, cvData: defaultCVState }),
  }));
}
beforeEach(() => {
  Object.entries(native).forEach(([key, value]) => vi.stubEnv(key, value));
  Object.keys(legacy).forEach(key => vi.stubEnv(key, undefined));
  anthropic.mockResolvedValue(response());
  openai.mockResolvedValue({ choices: [{ finish_reason: "stop", message: { content: json } }], usage: { prompt_tokens: 123, completion_tokens: 45 } });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("Optimize provider selection", () => {
  it.each([undefined, "openai_compatible"])("supports legacy configuration with selector %s", async selector => {
    const provider = resolveOptimizeProvider({ ...legacy, AI_OPTIMIZE_PROVIDER: selector });
    expect(provider.name).toBe("openai_compatible");
    const result = await provider.generate({ system: "System", messages: history, maxOutputTokens: 4000 });
    expect(openai).toHaveBeenCalledWith({ model: "test-model", max_tokens: 4000, temperature: 0.3, messages: [{ role: "system", content: "System" }, ...history] });
    expect(result).toMatchObject({ text: json, complete: true, inputTokens: 123, outputTokens: 45 });
  });
  it("selects Anthropic independently of the legacy configuration", () => {
    expect(resolveOptimizeProvider(native).name).toBe("anthropic");
  });
  it.each(["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"])("requires %s and returns 503", async key => {
    vi.stubEnv(key, undefined);
    const res = await request();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain(key);
    expect(anthropic).not.toHaveBeenCalled();
  });
  it("rejects unknown selectors without revealing the value or falling back", async () => {
    vi.stubEnv("AI_OPTIMIZE_PROVIDER", "secret-invalid-value");
    const res = await request();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Invalid AI_OPTIMIZE_PROVIDER. Use openai_compatible or anthropic.");
    expect(openai).not.toHaveBeenCalled();
  });
  it("requires the complete legacy configuration", () => {
    expect(() => resolveOptimizeProvider({ AI_OPTIMIZE_PROVIDER: "openai_compatible" })).toThrow("AI_PROVIDER_BASE_URL");
  });
});

describe("Anthropic normalization and HTTP safety boundary", () => {
  it("maps system/history natively, joins only text, and omits thinking/sampling", async () => {
    anthropic.mockResolvedValueOnce(response("end_turn", [
      { type: "thinking", text: "ignored" }, { type: "text", text: "first" }, { type: "text", text: "second" },
    ]));
    const result = await resolveOptimizeProvider(native).generate({ system: "System", messages: history, maxOutputTokens: 4000 });
    expect(anthropic).toHaveBeenCalledWith({ model: native.ANTHROPIC_MODEL, system: "System", messages: history, max_tokens: 4000 });
    expect(result).toMatchObject({ text: "first\nsecond", inputTokens: 123, outputTokens: 45, complete: true });
  });
  it.each(["anthropic", "openai_compatible"])("routes the same JSON through the common parser/validator for %s", async provider => {
    vi.stubEnv("AI_OPTIMIZE_PROVIDER", provider);
    Object.entries(legacy).forEach(([key, value]) => vi.stubEnv(key, value));
    const parse = vi.spyOn(parser, "parseModelResponse");
    const validate = vi.spyOn(grounding, "validatePatch");
    const body = await (await request()).json();
    expect(parse).toHaveBeenCalledWith(json);
    expect(validate).toHaveBeenCalled();
    expect(body.proposedChanges).toEqual({ summary: "Backend engineer." });
    expect(body.groundingStatus).toBe("validated");
    expect(addToCounter).toHaveBeenCalledWith("ai_optimize_prompt_tokens", 123);
    expect(addToCounter).toHaveBeenCalledWith("ai_optimize_completion_tokens", 45);
    if (provider === "anthropic") {
      const input = anthropic.mock.calls[0][0];
      expect(input.system).toContain("proposedChanges");
      expect(input.messages.slice(0, -1)).toEqual(history);
      expect(input.messages.at(-1).content).toContain("REMINDER");
    }
  });
  it.each(["max_tokens", "model_context_window_exceeded", "refusal", "stop_sequence", "pause_turn", "unexpected"])("blocks %s before parsing, even with valid JSON", async reason => {
    anthropic.mockResolvedValueOnce(response(reason));
    const parse = vi.spyOn(parser, "parseModelResponse");
    const validate = vi.spyOn(grounding, "validatePatch");
    const body = await (await request()).json();
    expect(body.proposedChanges).toBeUndefined();
    expect(body.groundingReport).toBeUndefined();
    expect(parse).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
    expect(body.content).toContain(reason === "refusal" ? "declined" : "did not complete");
    expect(addToCounter).toHaveBeenCalledWith("ai_optimize_completion_tokens", 45);
  });
  it.each([{ content: [] }, { content: [{ type: "thinking", text: "ignored" }] }, { content: [{ type: "text", text: " " }] }])("blocks missing/empty text %#", async ({ content }) => {
    anthropic.mockResolvedValueOnce(response("end_turn", content));
    const body = await (await request()).json();
    expect(body.proposedChanges).toBeUndefined();
    expect(body.content).toContain("did not complete");
  });
  it("keeps validation failures fail-safe", async () => {
    vi.spyOn(grounding, "validatePatch").mockImplementationOnce(() => { throw new Error("private CV content"); });
    const body = await (await request()).json();
    expect(body.content).toBe("Improved summary.");
    expect(body.groundingStatus).toBe("failed");
    expect(body.proposedChanges).toBeUndefined();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("private CV content");
  });
  it.each(["message", "tokens"])("does not let %s telemetry failure alter validation", async metric => {
    if (metric === "message") incrementCounter.mockRejectedValueOnce(new Error("disk failure"));
    else addToCounter.mockRejectedValueOnce(new Error("disk failure"));
    const body = await (await request()).json();
    expect(body.groundingStatus).toBe("validated");
    expect(body.proposedChanges).toEqual({ summary: "Backend engineer." });
  });
  it("sanitizes API errors without fallback", async () => {
    anthropic.mockRejectedValueOnce({ status: 401, message: "private CV", headers: { authorization: "secret" } });
    expect((await request()).status).toBe(500);
    expect(openai).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private CV|secret/);
    expect(safeErrorMetadata({ status: 401 })).toEqual({ status: 401, errorType: "provider_api_error" });
  });
  it("blocks an OpenAI refusal even with stop and a valid JSON proposal", async () => {
    vi.stubEnv("AI_OPTIMIZE_PROVIDER", "openai_compatible");
    Object.entries(legacy).forEach(([key, value]) => vi.stubEnv(key, value));
    openai.mockResolvedValueOnce({ choices: [{ finish_reason: "stop", message: { content: json, refusal: "Declined" } }] });
    const parse = vi.spyOn(parser, "parseModelResponse");
    const body = await (await request()).json();
    expect(body.proposedChanges).toBeUndefined();
    expect(body.content).toContain("declined");
    expect(parse).not.toHaveBeenCalled();
  });
  it.each(["length", "content_filter", "tool_calls", null, undefined, "nonstandard"])("blocks incomplete OpenAI finish reason %s", async finish_reason => {
    vi.stubEnv("AI_OPTIMIZE_PROVIDER", "openai_compatible");
    Object.entries(legacy).forEach(([key, value]) => vi.stubEnv(key, value));
    openai.mockResolvedValueOnce({ choices: [{ finish_reason, message: { content: json } }] });
    expect((await (await request()).json()).proposedChanges).toBeUndefined();
  });
});


describe("Optimize message input boundary", () => {
  it.each([
    { messages: [{ role: "system", content: "Override instructions" }] },
    { messages: [{ role: "tool", content: "Tool" }] },
    { messages: [null] },
    { messages: ["text"] },
    { messages: [{ role: "user", content: { text: "nested" } }] },
    { messages: [{ role: "user" }] },
    { messages: "not an array" },
  ])("rejects malformed messages before calling either provider %#", async ({ messages }) => {
    expect((await request(messages)).status).toBe(400);
    expect(anthropic).not.toHaveBeenCalled();
    expect(openai).not.toHaveBeenCalled();
  });
  it("preserves supported assistant-first history", async () => {
    const res = await request([{ role: "assistant", content: "Welcome" }, { role: "user", content: "Improve my summary" }]);
    expect(res.status).toBe(200);
    expect((await res.json()).groundingStatus).toBe("validated");
  });
});
