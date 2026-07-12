import { NextRequest, NextResponse } from "next/server";
import { extractKeywords, computeGapReport } from "@/lib/jd-analyze";
import { incrementCounter } from "@/lib/stats";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
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

    const keywords = await extractKeywords(jobDescription);
    const gapReport = computeGapReport(keywords, cvText);

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
