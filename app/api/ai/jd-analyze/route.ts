import { NextRequest, NextResponse } from "next/server";
import { extractKeywords, computeGapReport } from "@/lib/jd-analyze";
import { incrementCounter } from "@/lib/stats";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const maxDuration = 60;

// Same guards as /api/ai/analyze-ats: this endpoint reaches the same LLM, so
// leaving it uncapped would just move the abuse one URL over.
const MAX_CV_CHARS = 15000;
const MAX_JD_CHARS = 8000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(
      `jd-analyze:${clientKey(req.headers)}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS
    );
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many requests from this connection. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await req.json();
    const { cvText, jobDescription } = body as {
      cvText?: string;
      jobDescription?: string;
    };

    if (!cvText || typeof cvText !== "string" || cvText.trim().length === 0) {
      return NextResponse.json({ error: "Missing required field: cvText." }, { status: 400 });
    }

    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length === 0) {
      return NextResponse.json({ error: "Missing required field: jobDescription." }, { status: 400 });
    }

    const keywords = await extractKeywords(jobDescription.slice(0, MAX_JD_CHARS));
    const gapReport = computeGapReport(keywords, cvText.slice(0, MAX_CV_CHARS));

    incrementCounter("jd_analyze").catch(() => {});

    return NextResponse.json({ gapReport });
  } catch (error) {
    console.error("[JD Analyze API] Error:", error);

    if (error instanceof Error && error.message === "AI provider is not configured.") {
      return NextResponse.json(
        { error: "AI provider is not configured. Please check environment variables." },
        { status: 503 }
      );
    }

    if (error instanceof Error && error.message.includes("Could not parse JSON")) {
      return NextResponse.json(
        { error: "Keyword extraction failed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong while analyzing the job description. Please try again." },
      { status: 500 }
    );
  }
}
