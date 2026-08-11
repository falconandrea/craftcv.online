"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Segment error boundary. Without it, any render error in the results
 * dashboard replaces the whole page with Next's default screen and the user
 * loses the report; here they at least get a retry that keeps them on the tool.
 */
export default function AtsScoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ATS Score] Render error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center gap-6">
      <AlertTriangle className="w-12 h-12 text-[#ff00aa]" />
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-mono font-bold tracking-tight">
          The ATS report could not be displayed
        </h1>
        <p className="text-sm text-white/60 leading-relaxed">
          Something went wrong while rendering the result. Nothing was saved, so
          you can simply run the analysis again.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={reset}
          className="h-11 bg-[#b8ff00] text-black hover:bg-[#b8ff00]/90 font-bold tracking-widest uppercase"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Try again
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 bg-transparent border-white/20 text-white hover:text-white hover:bg-white/5"
        >
          <a href="/ats-score">Back to the tool</a>
        </Button>
      </div>
    </div>
  );
}
