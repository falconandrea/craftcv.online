"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Dropzone } from "@/components/ats/Dropzone";
import { ResultsDashboard, AtsScoreData } from "@/components/ats/ResultsDashboard";
import { toast } from "sonner";

/**
 * Interactive part of /ats-score. Split out of the page so the static SEO copy
 * in AtsScoreContent stays a server component and out of the client bundle.
 */
export function AtsScoreTool() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AtsScoreData | null>(null);

  const handleAnalyze = async (file: File, jobDescription: string) => {
    setIsAnalyzing(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription);
      }

      const response = await fetch("/api/ai/analyze-ats", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze the PDF.");
      }

      const results = data as AtsScoreData;
      setResults(results);

      // The API degrades to the deterministic report when the model fails, so
      // don't announce a full report the dashboard is not showing.
      if (results.aiUnavailable) {
        toast.warning("Deterministic checks are ready — the AI review failed this time.", {
          className: "border-yellow-500 bg-black text-yellow-500"
        });
      } else {
        toast.success("Ready! Here is your ATS report.", {
          className: "border-[#b8ff00] bg-black text-[#b8ff00]"
        });
      }

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      toast.error(message, {
        className: "border-[#ff00aa] bg-black text-[#ff00aa]"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Disclaimer */}
      <div className="w-full max-w-2xl mb-8 p-3 bg-[#00ffd5]/10 border border-[#00ffd5]/20 rounded-md flex items-start gap-3">
        <Info className="w-5 h-5 text-[#00ffd5] shrink-0 mt-0.5" />
        <p className="text-xs text-white/70 leading-relaxed">
          <strong className="text-[#00ffd5] block mb-1">Important Disclaimer &amp; Privacy</strong>
          This is an AI-powered simulation of generic enterprise ATS logic (like Workday, Taleo). Every company configures their ATS differently. A high score here does not guarantee a job interview.
          <span className="block mt-2">
            <strong className="text-[#00ffd5]/80">Privacy Note:</strong> The raw text extracted from your PDF is sent to our AI providers for parsing. Please do not upload sensitive documents if you do not consent to this.
          </span>
        </p>
      </div>

      {/* Content Area */}
      <div className="w-full transition-all duration-500">
        {!results ? (
          <div className={`transition-all duration-500 ${isAnalyzing ? 'opacity-50 scale-[0.98] blur-sm pointer-events-none' : 'opacity-100'}`}>
            <Dropzone onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
          </div>
        ) : (
          <ResultsDashboard data={results} onReset={handleReset} />
        )}

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-t-2 border-[#ff00aa] animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-r-2 border-[#00ffd5] animate-spin direction-reverse"></div>
              <div className="absolute inset-4 rounded-full border-b-2 border-[#b8ff00] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-white blink">AI</span>
              </div>
            </div>
            <h2 className="text-xl font-mono font-bold tracking-widest text-white uppercase blink">Scanning Document</h2>
            <p className="text-sm text-white/50 font-mono mt-2">Extracting text &amp; matching keywords...</p>
          </div>
        )}
      </div>
    </>
  );
}
