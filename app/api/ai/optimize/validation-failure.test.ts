import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { defaultCVState } from "@/state/types";
import * as grounding from "@/lib/ai/grounding/validate-patch";
import { POST } from "./route";

const { complete, incrementCounter, addToCounter } = vi.hoisted(() => ({
  complete: vi.fn(), incrementCounter: vi.fn(), addToCounter: vi.fn(),
}));
vi.mock("openai", () => ({ default: class {
  chat = { completions: { create: complete } };
} }));
vi.mock("@/lib/stats", () => ({ incrementCounter, addToCounter }));

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER_BASE_URL", "https://provider.example/v1");
  vi.stubEnv("AI_PROVIDER_API_KEY", "test-key");
  vi.stubEnv("AI_PROVIDER_MODEL", "test-model");
  complete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({
    message: "Here is my advice.", proposedChanges: { summary: "Backend engineer." },
  }) } }] });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetAllMocks(); });

async function request() {
  return POST(new NextRequest("http://localhost/api/ai/optimize", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Improve my summary" }], cvData: defaultCVState }),
  }));
}

describe("Optimize HTTP response validation boundary", () => {
  it("keeps conversational advice but exposes no applicable patch when validation throws", async () => {
    vi.spyOn(grounding, "validatePatch").mockImplementationOnce(() => { throw new Error("Invalid patch"); });
    const response = await request();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.content).toBe("Here is my advice.");
    expect(body.proposedChanges).toBeUndefined();
    expect(body.groundingReport).toBeUndefined();
    expect(body.groundingStatus).toBe("failed");
  });
  it("returns a validated patch and report when validation succeeds", async () => {
    const response = await request();
    const body = await response.json();
    expect(body.groundingStatus).toBe("validated");
    expect(body.proposedChanges).toEqual({ summary: "Backend engineer." });
    expect(body.groundingReport.flaggedInventions).toEqual([]);
  });

  it("keeps conversation-only responses usable without a validation state", async () => {
    complete.mockResolvedValueOnce({ choices: [{ message: { content: '{"message":"Advice only."}' } }] });
    const body = await (await request()).json();
    expect(body.content).toBe("Advice only.");
    expect(body.proposedChanges).toBeUndefined();
    expect(body.groundingStatus).toBeUndefined();
  });

  it("uses the flagged-additions counter and preserves validated changes if telemetry fails", async () => {
    complete.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({
      message: "Review this skill.", proposedChanges: { skills: ["Kubernetes"] },
    }) } }] });
    incrementCounter.mockImplementation(async (metric: string) => {
      if (metric === "grounding_unsupported_additions_flagged") throw new Error("Stats unavailable");
    });
    const body = await (await request()).json();
    expect(body.groundingStatus).toBe("validated");
    expect(body.proposedChanges.skills).toEqual(["Kubernetes"]);
    expect(body.groundingReport.flaggedInventions[0].term).toBe("Kubernetes");
    expect(incrementCounter).toHaveBeenCalledWith("grounding_unsupported_additions_flagged");
    expect(incrementCounter).not.toHaveBeenCalledWith("grounding_inventions_blocked");
  });

});
