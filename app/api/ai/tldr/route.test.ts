/**
 * Route-level regression tests for /api/ai/tldr rejection diagnostics and
 * the generation request contract.
 *
 * Reproduces every rejection branch of the "AI returned an invalid summary"
 * 502 with mocked provider responses, and locks the diagnostic contract:
 * each rejection logs categories and numeric usage/length diagnostics
 * — never the CV, prompt, response text, keys or headers.
 *
 * The live experience failure (2026-10-12) showed `finish_reason: "length"`
 * and no complete JSON object; these tests lock the request contract (budget
 * headroom, no unverified reasoning parameters, no automatic retries) and the
 * rejection of responses whose generation did not terminate normally. The
 * budget fix itself needs the one live replay to be confirmed on the provider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

type MockCompletion = {
  usage?: { completion_tokens: number; completion_tokens_details?: { reasoning_tokens?: number } };
  choices: Array<{
    message: { content: string | null } | null;
    finish_reason: string | null;
  }>;
};

let mockCompletion: MockCompletion;
let createImpl: () => Promise<MockCompletion>;

/** Argument of the single chat.completions.create call of the current test. */
let lastRequest: Record<string, unknown> | undefined;
/** Options passed to the OpenAI client constructor (retry/timeout policy). */
let lastClientOptions: Record<string, unknown> | undefined;
let createCallCount = 0;

vi.mock("openai", () => ({
  default: class MockOpenAI {
    constructor(options: Record<string, unknown>) {
      lastClientOptions = options;
    }
    chat = {
      completions: {
        create: async (params: Record<string, unknown>): Promise<MockCompletion> => {
          lastRequest = params;
          createCallCount += 1;
          return createImpl();
        },
      },
    };
  },
}));

import { POST, TLDR_MAX_OUTPUT_TOKENS } from "./route";
import { TLDR_SYSTEM_PROMPT } from "@/lib/ai/prompts/tldr";

const DESCRIPTION = "Sviluppo di interfacce React e TypeScript. SECRET-DESCRIPTION-MARKER per il test privacy.";

let requestCounter = 0;

function makeRequest(): NextRequest {
  requestCounter += 1;
  return new NextRequest("http://localhost/api/ai/tldr", {
    method: "POST",
    headers: { "x-forwarded-for": `10.0.0.${requestCounter}` },
    body: JSON.stringify({
      kind: "experience",
      title: "Frontend Developer",
      role: "Frontend Developer",
      description: DESCRIPTION,
      language: "it",
    }),
  });
}

function completionWith(content: string | null, finish_reason: string | null = "stop"): void {
  mockCompletion = { choices: [{ message: { content }, finish_reason }] };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

function lastWarnPayload(): Record<string, unknown> {
  expect(warnSpy).toHaveBeenCalled();
  const args = warnSpy.mock.calls[warnSpy.mock.calls.length - 1];
  const payload = args.find((a) => typeof a === "object" && a !== null);
  expect(payload).toBeDefined();
  return payload as Record<string, unknown>;
}

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER_BASE_URL", "https://openrouter.example/v1");
  vi.stubEnv("AI_PROVIDER_API_KEY", "test-key");
  vi.stubEnv("AI_PROVIDER_MODEL", "test-model");
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  createImpl = () => Promise.resolve(mockCompletion);
  lastRequest = undefined;
  lastClientOptions = undefined;
  createCallCount = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
  warnSpy.mockRestore();
});

describe("POST /api/ai/tldr — rejection branches with mocked provider", () => {
  it("returns 200 with the normalized tldr for a valid response", async () => {
    completionWith('Sure! {"tldr":"  Sviluppatore   interfacce React  "}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tldr: "Sviluppatore interfacce React" });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("classifies plain-prose output (no JSON object) as no_json", async () => {
    completionWith("Sviluppatore frontend con esperienza React e TypeScript.");
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("AI returned an invalid summary. Please try again.");
    expect(lastWarnPayload()).toMatchObject({
      kind: "experience",
      rejection: "no_json",
      finishReason: "stop",
    });
  });

  it("classifies null message content as no_content", async () => {
    completionWith(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect(lastWarnPayload()).toMatchObject({
      kind: "experience",
      rejection: "no_content",
      finishReason: "stop",
    });
  });

  it("classifies balanced-but-invalid JSON (single quotes) as no_json — parser skips unparseable slices", async () => {
    // findFirstJsonObject only returns slices that already parse, so
    // single-quoted pseudo-JSON yields no candidate at all. The
    // json_parse_failed category stays as a defensive branch for parser
    // contract changes.
    completionWith("{'tldr':'Sviluppatore di interfacce React'}");
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("AI returned an invalid summary. Please try again.");
    expect(lastWarnPayload()).toMatchObject({
      kind: "experience",
      rejection: "no_json",
      finishReason: "stop",
    });
  });

  it("classifies JSON without a string tldr field as missing_tldr", async () => {
    completionWith('{"summary":"Sviluppatore frontend"}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect(lastWarnPayload().rejection).toBe("missing_tldr");
  });

  it("classifies a non-string tldr value as missing_tldr", async () => {
    completionWith('{"tldr":123}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect(lastWarnPayload().rejection).toBe("missing_tldr");
  });

  it("classifies a whitespace-only tldr as empty_tldr", async () => {
    completionWith('{"tldr":"   "}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect(lastWarnPayload().rejection).toBe("empty_tldr");
  });

  it("classifies over-length output as too_long_chars with measured lengths", async () => {
    const long = "a".repeat(201);
    completionWith(`{"tldr":"${long}"}`);
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const payload = lastWarnPayload();
    expect(payload.rejection).toBe("too_long_chars");
    expect(payload.chars).toBe(201);
    expect(payload.words).toBe(1);
    expect(payload.finishReason).toBe("stop");
  });

  it("classifies over-word output as too_many_words with measured lengths", async () => {
    const manyWords = Array.from({ length: 31 }, (_, i) => `w${i}`).join(" ");
    expect(manyWords.length).toBeLessThan(200);
    completionWith(`{"tldr":"${manyWords}"}`);
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const payload = lastWarnPayload();
    expect(payload.rejection).toBe("too_many_words");
    expect(payload.words).toBe(31);
    expect(payload.chars).toBe(manyWords.length);
  });

  it("classifies masked placeholders as placeholder", async () => {
    completionWith('{"tldr":"Sviluppatore contattabile via [EMAIL] con React"}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect(lastWarnPayload().rejection).toBe("placeholder");
  });

  it("classifies finish_reason 'length' as length_truncated even when a JSON object is present", async () => {
    completionWith('{"tldr":"truncated json', "length");
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    const payload = lastWarnPayload();
    expect(payload.finishReason).toBe("length");
    expect(payload.rejection).toBe("length_truncated");
  });

  it("never logs CV description, prompt or response text in diagnostics", async () => {
    completionWith('{"tldr":"' + "x".repeat(250) + '"}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    for (const call of warnSpy.mock.calls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain("SECRET-DESCRIPTION-MARKER");
      expect(serialized).not.toContain("test-key");
      expect(serialized).not.toContain("xxxxxxxx");
    }
  });

  it("keeps the generic provider-failure message for thrown errors", async () => {
    createImpl = () => Promise.reject(new Error("provider down"));
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("Could not generate the summary. Please try again.");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ─── Generation request contract (regression for the 2026-10-12 live bug) ──
// Evidence: with `max_tokens: 500` the provider returned finish_reason
// "length" and the response carried no complete JSON object, so every
// experience TL;DR was rejected. Hypothesis (not proven by the log): the
// budget was consumed by preambles and/or reasoning tokens before the JSON
// closed. The budget now carries headroom for either explanation; the text
// contract (200 chars / 30 words) and the rejection of incomplete responses
// are unchanged.

describe("POST /api/ai/tldr — generation request contract", () => {
  it("sends an output budget with headroom, never the old 500-token cap", async () => {
    completionWith('{"tldr":"Sviluppatore interfacce React"}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(lastRequest).toBeDefined();
    expect(TLDR_MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(2000);
    expect(lastRequest!.max_tokens).toBe(TLDR_MAX_OUTPUT_TOKENS);
  });

  it("keeps the model, temperature and prompt contract of the request", async () => {
    completionWith('{"tldr":"Sviluppatore interfacce React"}');
    await POST(makeRequest());
    expect(lastRequest!.model).toBe("test-model");
    expect(lastRequest!.temperature).toBe(0.2);
    expect(lastRequest!.stream).toBeUndefined();
    const messages = lastRequest!.messages as Array<{ role: string; content: string }>;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: "system", content: TLDR_SYSTEM_PROMPT });
    expect(messages[1].role).toBe("user");
    expect(JSON.parse(messages[1].content)).toEqual({
      language: "it",
      kind: "experience",
      title: "Frontend Developer",
      role: "Frontend Developer",
      description: DESCRIPTION,
    });
  });

  it("sends no unverified reasoning parameters", async () => {
    completionWith('{"tldr":"Sviluppatore interfacce React"}');
    await POST(makeRequest());
    // OpenRouter exposes provider-specific reasoning controls, but none are
    // verified for this model: the route must not enable them implicitly.
    for (const key of ["reasoning", "reasoning_effort", "include_reasoning", "thinking"]) {
      expect(Object.keys(lastRequest!)).not.toContain(key);
    }
  });

  it("never retries a paid completion automatically", async () => {
    completionWith('{"tldr":"Sviluppatore interfacce React"}');
    await POST(makeRequest());
    expect(lastClientOptions).toMatchObject({
      baseURL: "https://openrouter.example/v1",
      maxRetries: 0,
    });
    expect(createCallCount).toBe(1);
  });
});

describe("POST /api/ai/tldr — finishReason: length handling", () => {
  it("rejects a JSON response cut mid-string as length_truncated, without truncating, repairing or retrying", async () => {
    const partial = '{"tldr":"Sviluppatore interfacce React con Node';
    completionWith(partial, "length");
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("AI returned an invalid summary. Please try again.");
    expect(lastWarnPayload()).toMatchObject({
      kind: "experience",
      rejection: "length_truncated",
      finishReason: "length",
    });
    // An unterminated generation is rejected as-is: never truncated into a
    // shorter tldr, never retried with a second paid request.
    expect(createCallCount).toBe(1);
    for (const call of warnSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("Sviluppatore interfacce React con Node");
    }
  });

  it("rejects budget-cut prose (no salvageable JSON) as length_truncated and keeps the length signal", async () => {
    completionWith("Sviluppatore frontend con React e Type", "length");
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect(lastWarnPayload()).toMatchObject({
      kind: "experience",
      rejection: "length_truncated",
      finishReason: "length",
    });
    expect(createCallCount).toBe(1);
  });

  it("rejects a complete in-limit JSON payload flagged as length: the provider reports an unterminated generation", async () => {
    completionWith('{"tldr":"Sviluppatore interfacce React"}', "length");
    const res = await POST(makeRequest());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("AI returned an invalid summary. Please try again.");
    expect(lastWarnPayload()).toMatchObject({
      kind: "experience",
      rejection: "length_truncated",
      finishReason: "length",
    });
  });

  it("accepts the same complete payload when the generation terminates normally", async () => {
    completionWith('{"tldr":"Sviluppatore interfacce React"}', "stop");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).tldr).toBe("Sviluppatore interfacce React");
  });
});


describe("OpenRouter DeepSeek TL;DR reasoning policy", () => {
  it("disables default reasoning only on the verified OpenRouter model", async () => {
    vi.stubEnv("AI_PROVIDER_BASE_URL", "https://openrouter.ai/api/v1");
    vi.stubEnv("AI_PROVIDER_MODEL", "deepseek/deepseek-v4.1-flash");
    completionWith('{"tldr":"Sviluppatore interfacce React"}');
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(lastRequest!.reasoning).toEqual({ enabled: false });
    expect(createCallCount).toBe(1);
  });

  it("does not send OpenRouter controls to another endpoint", async () => {
    vi.stubEnv("AI_PROVIDER_MODEL", "deepseek/deepseek-v4.1-flash");
    completionWith('{"tldr":"Sviluppatore interfacce React"}');
    await POST(makeRequest());
    expect(lastRequest).not.toHaveProperty("reasoning");
  });

  it("does not assume reasoning support for another OpenRouter model", async () => {
    vi.stubEnv("AI_PROVIDER_BASE_URL", "https://openrouter.ai/api/v1");
    completionWith('{"tldr":"Sviluppatore interfacce React"}');
    await POST(makeRequest());
    expect(lastRequest).not.toHaveProperty("reasoning");
  });

  it("logs only numeric usage diagnostics on rejection", async () => {
    const content = "SECRET-RESPONSE-MARKER";
    completionWith(content, "length");
    mockCompletion.usage = { completion_tokens: 2000, completion_tokens_details: { reasoning_tokens: 1999 } };
    await POST(makeRequest());
    const payload = lastWarnPayload();
    expect(payload).toEqual({ kind: "experience", rejection: "length_truncated", finishReason: "length", contentChars: content.length, completionTokens: 2000, reasoningTokens: 1999 });
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(content);
  });
});
