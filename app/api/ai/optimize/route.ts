import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { CVState } from "@/state/types";
import { incrementCounter, addToCounter } from "@/lib/stats";
import { validatePatch } from "@/lib/ai/grounding/validate-patch";
import { hasGroundingFlags } from "@/lib/ai/grounding/types";
import type { GroundingStatus } from "@/lib/ai/grounding/types";
import { buildQuickReference, toPromptString } from "@/lib/cv/quick-reference";
import { buildCvContext } from "@/lib/ai/context-selection";
import { estimateTokens } from "@/lib/ai/token-estimator";
import { parseModelResponse } from "@/lib/ai/parse-model-response";
import {
  OPTIMIZE_SYSTEM_PROMPT,
  buildLanguageInstruction,
  buildDateContext,
} from "@/lib/ai/prompts/optimize";

// (Language detection heuristic removed in favor of explicit user setting cvLanguage)

// ---------------------------------------------------------------------------
// System prompt lives in lib/ai/prompts/optimize.ts (audited 2026-10).
// The model ALWAYS returns:
//   { "message": string, "proposedChanges"?: object }
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// POST /api/ai/optimize
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const baseURL = process.env.AI_PROVIDER_BASE_URL;
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    const model = process.env.AI_PROVIDER_MODEL;

    if (!baseURL || !apiKey || !model) {
      return NextResponse.json(
        { error: "AI provider is not configured. Please set AI_PROVIDER_BASE_URL, AI_PROVIDER_API_KEY, and AI_PROVIDER_MODEL in your .env.local file." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { messages, cvData } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      cvData: CVState;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request: messages array required." }, { status: 400 });
    }

    // Read explicit CV language from state (fallback formatting if missing)
    const languageInstruction = buildLanguageInstruction(
      cvData.cvLanguage === "it" ? "it" : "en"
    );

    const snapshot = buildQuickReference(cvData);
    const snapshotStr = toPromptString(snapshot);

    // ─── Token accounting ( Cluster D -40% success metric ) ────────
    // Estimate what the prompt would have cost if we sent the full CV JSON,
    // so the snapshot savings ratio is measurable in aggregate stats.
    // Best-effort: must never throw or block the request.
    const snapshotTokens = estimateTokens(snapshotStr);
    const fullJsonTokens = estimateTokens(JSON.stringify(cvData));
    const tokensAvoided = Math.max(0, fullJsonTokens - snapshotTokens);

    // Language-aware context selection (lib/ai/context-selection.ts):
    // compact snapshot-only, targeted detail entries, or whole-CV detail
    // for explicit review requests — deterministic and unit-tested.
    const cvContext = buildCvContext(
      cvData,
      messages[messages.length - 1]?.content
    );

    const client = new OpenAI({ apiKey, baseURL });

    // Build the message list. We deliberately do NOT use a prefill trick
    // (no synthetic assistant "{" message): the trick assumes the provider
    // natively supports assistant message prefilling, which is true for
    // Anthropic Claude but breaks for DeepSeek / Llama / Mistral via
    // OpenAI-compatible proxies — they emit chat-template markers as text
    // (e.g. "#start#", "# Human:") that corrupt the response. Modern models
    // follow JSON instructions reliably without prefill; the robust parser
    // handles any residual messiness.
    const llmMessages = [
      {
        role: "system" as const,
        // Audited composition (lib/ai/prompts/optimize.ts): language
        // separation + explicit current date + prompt + CV context.
        content:
          languageInstruction +
          buildDateContext() +
          OPTIMIZE_SYSTEM_PROMPT +
          cvContext,
      },
      ...messages,
      { role: "user" as const, content: `REMINDER: You MUST respond with a raw JSON object starting with {. Include "message" and "proposedChanges" keys. Do NOT use markdown or code fences. Output ONLY valid JSON.` },
    ];

    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4000,
      temperature: 0.3,
      messages: llmMessages,
    });

    const modelOutput = completion.choices[0]?.message?.content ?? "";

    const parsed = parseModelResponse(modelOutput);

    await incrementCounter("ai_messages");

    // ─── Token accounting ( continued ) ────────────────────────────
    // Actual provider-reported usage + estimated savings. Best-effort.
    try {
      const usage = completion.usage;
      if (usage) {
        if (typeof usage.prompt_tokens === "number") {
          await addToCounter("ai_optimize_prompt_tokens", usage.prompt_tokens);
        }
        if (typeof usage.completion_tokens === "number") {
          await addToCounter("ai_optimize_completion_tokens", usage.completion_tokens);
        }
      }
      await addToCounter("ai_optimize_snapshot_tokens", snapshotTokens);
      await addToCounter("ai_optimize_full_json_tokens_avoided", tokensAvoided);
    } catch (tokenStatsError) {
      console.error("[AI Optimize] Token stats error:", tokenStatsError);
    }

    // ─── Grounding validation ─────────────────────────────────────
    let finalChanges = undefined;
    let groundingReport = undefined;
    let groundingStatus: GroundingStatus | undefined;

    if (parsed.proposedChanges && cvData) {
      try {
        const { cleanPatch, report } = validatePatch(
          parsed.proposedChanges as import("@/state/types").CVPatch,
          cvData
        );
        finalChanges = cleanPatch;
        groundingReport = report;
        groundingStatus = "validated";
      } catch (groundingError) {
        // Keep conversational advice, but never expose an unvalidated patch.
        finalChanges = undefined;
        groundingReport = undefined;
        groundingStatus = "failed";
        console.error("[AI Grounding] Validation error:", groundingError);
      }
    }

    // Telemetry failure must not change a completed validation result.
    if (groundingReport && hasGroundingFlags(groundingReport)) {
      try {
        if (groundingReport.flaggedInventions.length > 0) {
          await incrementCounter("grounding_unsupported_additions_flagged");
        }
        if (groundingReport.needsVerification.length > 0) {
          await incrementCounter("grounding_verifications_requested");
        }
      } catch (statsError) {
        console.error("[AI Grounding] Stats error:", statsError);
      }
    }

    return NextResponse.json({
      content: parsed.message ?? "I couldn't generate a response. Please try again.",
      proposedChanges: finalChanges ?? undefined,
      groundingReport: groundingReport ?? undefined,
      groundingStatus,
    });
  } catch (error) {
    console.error("[AI Optimize API] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong while contacting the AI provider. Please try again." },
      { status: 500 }
    );
  }
}
