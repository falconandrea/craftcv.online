import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { TLDR_SYSTEM_PROMPT } from "@/lib/ai/prompts/tldr";
import { evaluateTldr } from "@/lib/ai/tldr-validation";

export const maxDuration = 60;

/** Generation headroom; visible text remains limited to 200 chars / 30 words. */
export const TLDR_MAX_OUTPUT_TOKENS = 2000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`tldr:${clientKey(req.headers)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid entry." }, { status: 400 });
  }
  const { kind, title, role, description, language } = body as Record<string, unknown>;
  if (
    (kind !== "experience" && kind !== "project") ||
    (language !== "en" && language !== "it") ||
    typeof title !== "string" || title.length > 300 ||
    typeof role !== "string" || role.length > 300 ||
    typeof description !== "string" || !description.trim() || description.length > 15000
  ) {
    return NextResponse.json({ error: "Provide a description (up to 15,000 characters) and a valid CV language." }, { status: 400 });
  }

  const baseURL = process.env.AI_PROVIDER_BASE_URL;
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_PROVIDER_MODEL;
  if (!baseURL || !apiKey || !model) {
    return NextResponse.json({ error: "AI generation is currently unavailable." }, { status: 503 });
  }

  try {
    const client = new OpenAI({ baseURL, apiKey, timeout: 45000, maxRetries: 0 });
    // OpenRouter model metadata (2026-10-12): this model defaults to high
    // reasoning but permits disabling it. A short TL;DR needs no thinking budget.
    const disableReasoning = new URL(baseURL).hostname === "openrouter.ai"
      && model === "deepseek/deepseek-v4.1-flash";
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: TLDR_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ language, kind, title, role, description }) },
      ],
      temperature: 0.2,
      max_tokens: TLDR_MAX_OUTPUT_TOKENS,
      ...(disableReasoning ? { reasoning: { enabled: false } } : {}),
    });
    const choice = completion.choices[0];
    const evaluation = evaluateTldr(choice?.message?.content ?? null, choice?.finish_reason ?? null);
    if (!evaluation.ok) {
      // Minimal diagnostics for the "invalid summary" 502: rejection category
      // ("length_truncated" = the provider stopped generating before normal
      // termination, i.e. the output budget ran out), candidate lengths when
      // a string existed, and the provider finish reason. Never logs the CV,
      // prompt, response text, keys or headers.
      console.warn("[AI TLDR] Rejected summary", {
        kind,
        rejection: evaluation.rejection,
        finishReason: choice?.finish_reason ?? null,
        contentChars: choice?.message?.content?.length ?? 0,
        ...(completion.usage ? {
          completionTokens: completion.usage.completion_tokens,
          reasoningTokens: completion.usage.completion_tokens_details?.reasoning_tokens ?? null,
        } : {}),
        ...(evaluation.chars !== undefined ? { chars: evaluation.chars, words: evaluation.words } : {}),
      });
      return NextResponse.json({ error: "AI returned an invalid summary. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ tldr: evaluation.tldr });
  } catch {
    return NextResponse.json({ error: "Could not generate the summary. Please try again." }, { status: 502 });
  }
}
