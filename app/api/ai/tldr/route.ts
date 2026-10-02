import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { findFirstJsonObject } from "@/lib/ai/parse-model-response";
import { TLDR_SYSTEM_PROMPT } from "@/lib/ai/prompts/tldr";

export const maxDuration = 60;

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
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: TLDR_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ language, kind, title, role, description }) },
      ],
      temperature: 0.2,
      max_tokens: 500,
    });
    const json = findFirstJsonObject(completion.choices[0]?.message.content ?? "");
    const result: unknown = json ? JSON.parse(json) : null;
    const tldr = result && typeof result === "object" && "tldr" in result && typeof result.tldr === "string"
      ? result.tldr.trim().replace(/\s+/g, " ") : "";
    if (!tldr || tldr.length > 200 || tldr.split(/\s+/).length > 30 || /\[(?:PHONE|EMAIL|LINK|CANDIDATE NAME)\]/i.test(tldr)) {
      return NextResponse.json({ error: "AI returned an invalid summary. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ tldr });
  } catch {
    return NextResponse.json({ error: "Could not generate the summary. Please try again." }, { status: 502 });
  }
}
