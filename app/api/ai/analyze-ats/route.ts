import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { incrementCounter } from "@/lib/stats";
import { runAllChecks } from "@/lib/ats-rules";
import { extractKeywords, computeGapReport } from "@/lib/jd-analyze";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { evaluationFromCompletion, type AiEvaluation } from "@/lib/ats-ai-response";

export const maxDuration = 60; // Increase max duration for Vercel if needed

/** Same limits as /api/ai/import-pdf — both routes feed the same prompt path. */
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 15000;
const MAX_JD_CHARS = 8000;

/** Two LLM calls per request, so the quota is deliberately tight. */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

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

    const limit = rateLimit(
      `analyze-ats:${clientKey(req.headers)}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS
    );
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many analyses from this connection. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const rawJobDescription = formData.get("jobDescription");

    if (!pdfFile) {
      return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
    }

    if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF file." },
        { status: 400 }
      );
    }

    if (pdfFile.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 5 MB." },
        { status: 413 }
      );
    }

    const jobDescription =
      typeof rawJobDescription === "string" ? rawJobDescription.trim().slice(0, MAX_JD_CHARS) : "";

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
    // Run on the full text: the rules are cheap and more accurate with everything.
    const { checks: deterministicChecks, lintScore } = runAllChecks(parsedText, pdfFile.name);
    incrementCounter("ats_lint_checks").catch(() => { });

    // Only the prompt payload is truncated, to bound token cost.
    const promptText = parsedText.slice(0, MAX_TEXT_CHARS);
    const wasTruncated = parsedText.length > MAX_TEXT_CHARS;

    // ── Keyword gap analysis (when JD provided) ───────────────────────
    let gapReport = undefined;
    if (jobDescription !== "") {
      try {
        const keywords = await extractKeywords(jobDescription);
        gapReport = computeGapReport(keywords, parsedText);
        incrementCounter("jd_analyze").catch(() => {});
      } catch (err) {
        // Fail open — don't break ATS test if keyword engine fails
        console.error("[ATS Score] Keyword gap analysis failed (non-fatal):", err);
      }
    }

    let userPrompt = `Here is the extracted text from the user's PDF resume:\n\n<resume_text>\n${promptText}\n</resume_text>\n`;
    if (wasTruncated) {
      userPrompt += `\n(The text above was truncated for length; judge only what you can see.)\n`;
    }
    userPrompt += `\nPlease act as an ATS parser and evaluate it based on the system instructions.\n`;

    if (jobDescription !== "") {
      userPrompt += `\nHere is the target Job Description:\n<job_description>\n${jobDescription}\n</job_description>\n`;
      userPrompt += `Please deeply analyze the "Keyword Match" against this job description.\n`;

      // Ground the model on the deterministic scan so the two keyword numbers
      // shown side by side in the UI cannot contradict each other.
      if (gapReport) {
        const missing = gapReport.missing.map(k => k.keyword).slice(0, 20);
        userPrompt += `\nA deterministic keyword scan already ran on this CV. Treat it as ground truth and do not contradict it:\n`;
        userPrompt += gapReport.keywordScore !== null
          ? `- Must-have keywords present: ${gapReport.presentMustHave} of ${gapReport.totalMustHave} (${gapReport.keywordScore}%).\n`
          : `- The posting lists no must-have keywords.\n`;
        userPrompt += `- Keywords found in the CV: ${gapReport.present.map(k => k.keyword).slice(0, 20).join(", ") || "none"}.\n`;
        userPrompt += `- Keywords missing from the CV: ${missing.join(", ") || "none"}.\n`;
        if (gapReport.keywordScore !== null) {
          userPrompt += `Use ${gapReport.keywordScore} as the keywordMatch component score.\n`;
        }
      }
    } else {
      userPrompt += `\nNo specific Job Description provided. Provide general best practices for their likely field.\n`;
    }

    // ── AI evaluation (best effort) ────────────────────────────────────
    // A model failure must not throw away the deterministic report the user
    // is already entitled to, so it degrades instead of returning an error.
    let evaluation: AiEvaluation | null = null;
    try {
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
      evaluation = evaluationFromCompletion(rawContent);
      if (!evaluation) {
        console.error("[ATS Score] AI response did not contain a usable score:", rawContent.slice(0, 500));
      }
    } catch (err) {
      console.error("[ATS Score] AI evaluation failed (non-fatal):", err);
    }

    // Fire-and-forget: a stats failure must not discard a completed analysis.
    incrementCounter("ats_tests").catch(() => { });

    return NextResponse.json({
      ...(evaluation ?? {}),
      aiUnavailable: evaluation === null,
      deterministicChecks,
      lintScore,
      gapReport,
      textTruncated: wasTruncated,
    });
  } catch (error) {
    console.error("[ATS Score API] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong while analyzing the ATS score. Please try again." },
      { status: 500 }
    );
  }
}
