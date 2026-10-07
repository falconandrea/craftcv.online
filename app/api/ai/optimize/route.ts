import { NextRequest, NextResponse } from "next/server";
import { AiConfigurationError, resolveOptimizeProvider } from "@/lib/ai/providers/config";
import { safeErrorMetadata } from "@/lib/ai/providers/types";
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
    const provider = resolveOptimizeProvider();

    const body = await req.json();
    const { messages, cvData } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      cvData: CVState;
    };

    if (!Array.isArray(messages) || messages.some(message =>
      !message || typeof message !== "object" ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string"
    )) {
      return NextResponse.json(
        { error: "Invalid request: messages must contain only user/assistant roles with string content." },
        { status: 400 }
      );
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

    const completion = await provider.generate({
      system: languageInstruction + buildDateContext() + OPTIMIZE_SYSTEM_PROMPT + cvContext,
      messages: [
        ...messages,
        { role: "user", content: `REMINDER: You MUST respond with a raw JSON object starting with {. Include "message" and "proposedChanges" keys. Do NOT use markdown or code fences. Output ONLY valid JSON.` },
      ],
      maxOutputTokens: 4000,
    });

    const modelOutput = completion.text;

    // Incomplete/refused output never reaches the parser or validator.
    const parsed = completion.complete ? parseModelResponse(modelOutput) : {
      message: completion.refused
        ? "The AI provider declined this request. Please rephrase your request."
        : "The AI provider did not complete the response. No changes can be applied. Please try a smaller request.",
      proposedChanges: undefined,
    };
    if (!completion.complete) {
      console.warn("[AI Optimize] Incomplete response", {
        provider: provider.name, stopReason: completion.stopReason,
      });
    }

    // ─── Token accounting ( continued ) ────────────────────────────
    // Actual provider-reported usage + estimated savings. Best-effort.
    try {
      await incrementCounter("ai_messages");
      if (typeof completion.inputTokens === "number") {
        await addToCounter("ai_optimize_prompt_tokens", completion.inputTokens);
      }
      if (typeof completion.outputTokens === "number") {
        await addToCounter("ai_optimize_completion_tokens", completion.outputTokens);
      }
      await addToCounter("ai_optimize_snapshot_tokens", snapshotTokens);
      await addToCounter("ai_optimize_full_json_tokens_avoided", tokensAvoided);
    } catch (tokenStatsError) {
      console.error("[AI Optimize] Token stats error:", { provider: provider.name, ...safeErrorMetadata(tokenStatsError) });
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
        console.error("[AI Grounding] Validation error:", { provider: provider.name, ...safeErrorMetadata(groundingError) });
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
        console.error("[AI Grounding] Stats error:", { provider: provider.name, ...safeErrorMetadata(statsError) });
      }
    }

    return NextResponse.json({
      content: parsed.message ?? "I couldn't generate a response. Please try again.",
      proposedChanges: finalChanges ?? undefined,
      groundingReport: groundingReport ?? undefined,
      groundingStatus,
    });
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[AI Optimize API] Error:", {
      provider: process.env.AI_OPTIMIZE_PROVIDER === "anthropic" ? "anthropic" : "openai_compatible",
      ...safeErrorMetadata(error),
    });
    return NextResponse.json(
      { error: "Something went wrong while contacting the AI provider. Please try again." },
      { status: 500 }
    );
  }
}
