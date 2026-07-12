import { NextRequest, NextResponse } from "next/server";
import { incrementCounter } from "@/lib/stats";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { metric } = body;

    if (
      metric === "cv_created" ||
      metric === "ai_messages" ||
      metric === "pdf_uploaded" ||
      metric === "ats_tests"
    ) {
      // Fire and forget, don't wait for the file to be written to return 204
      incrementCounter(metric).catch((e) =>
        console.error(`[Stats API] Background write failed for ${metric}: ${e}`)
      );
    }
    
    return new NextResponse(null, { status: 204 });
  } catch {
    // Return graceful 204 on bad JSON to prevent client-side noise
    return new NextResponse(null, { status: 204 });
  }
}
