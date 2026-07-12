import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { incrementCounter } from "@/lib/stats";
import { runAllChecks } from "@/lib/ats-rules";

export const maxDuration = 60; // Increase max duration for Vercel if needed

const SYSTEM_PROMPT = `You are a strict, enterprise-grade Applicant Tracking System (ATS) parser and recruiter AI.
Your job is to read the extracted text of a user's PDF resume and provide a realistic ATS evaluation score.

## Rules
1. You MUST ALWAYS return a raw JSON object (no markdown, no code fences).
2. Be strict but constructive. Simulate how actual ATS (like Workday, Taleo) might struggle with weird formatting or missing dates, and how recruiters look for impact metrics.

## JSON Format
You must return the following JSON structure exactly:
{
  "score": <number 0-100>,
  "componentScores": {
    "formatting": <number 0-100>,
    "impact": <number 0-100>,
    "keywordMatch": <number 0-100, or null if no Job Description was provided>
  },
  "feedback": [
    {
      "category": "formatting" | "impact" | "keyword" | "missing_info",
      "status": "passed" | "warning" | "failed",
      "title": "Short title of the check",
      "description": "Actionable explanation of why it passed or failed."
    }
  ]
}

## Guidelines for Scoring:
- Formatting: Check if it's readable. Are sections clear? Are contact info and dates present? Do NOT penalize the use of "Present", "Current", or similar words for an end date (this is industry standard).
- Impact: Are there action verbs? Are there measurable metrics (numbers, %, $, time)?
- Keyword Match: If a Job Description is provided, compare the skills and buzzwords in the text to the JD. If no JD is provided, base it on generalized best practices for their explicit role (if guessable) and return null for the keywordMatch numeric score.
- Missing Info: Check for phone, email, missing dates, etc.`;

function parseModelResponse(raw: string): any {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* fall through */ }
  }
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* fall through */ }
  }
  throw new Error("Could not parse JSON from AI response.");
}

export async function POST(req: NextRequest) {
  try {
    const baseURL = process.env.AI_PROVIDER_BASE_URL;
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    const model = process.env.AI_PROVIDER_MODEL;

    if (!baseURL || !apiKey || !model) {
      return NextResponse.json(
        { error: "AI provider is not configured. Please check environment variables." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!pdfFile) {
      return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
    }

    // Convert file to Buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedText = "";
    try {
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      parsedText = pdfData.text?.trim() || "";
    } catch (err) {
      console.error("[ATS Score] PDF Parse Error:", err);
      return NextResponse.json({ error: "Could not parse text from the uploaded PDF." }, { status: 400 });
    }

    if (!parsedText || parsedText.trim() === "") {
      return NextResponse.json({ error: "The PDF appears to be empty or contains only images (no text)." }, { status: 400 });
    }

    // ── Deterministic checks (no AI, run before LLM) ─────────────────
    const { checks: deterministicChecks, lintScore } = runAllChecks(parsedText, pdfFile.name);
    incrementCounter("ats_lint_checks").catch(() => { });

    let userPrompt = `Here is the extracted text from the user's PDF resume:\n\n<resume_text>\n${parsedText}\n</resume_text>\n`;
    userPrompt += `\nPlease act as an ATS parser and evaluate it based on the system instructions.\n`;

    if (jobDescription && jobDescription.trim() !== "") {
      userPrompt += `\nHere is the target Job Description:\n<job_description>\n${jobDescription}\n</job_description>\n`;
      userPrompt += `Please deeply analyze the "Keyword Match" against this job description.\n`;
    } else {
      userPrompt += `\nNo specific Job Description provided. Provide general best practices for their likely field.\n`;
    }

    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 2000,
      temperature: 0.2, // low temperature for strict, analytical response
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";
    const data = parseModelResponse(rawContent);

    await incrementCounter("ats_tests");

    return NextResponse.json({
      ...data,
      deterministicChecks,
      lintScore,
    });
  } catch (error) {
    console.error("[ATS Score API] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong while analyzing the ATS score. Please try again." },
      { status: 500 }
    );
  }
}
