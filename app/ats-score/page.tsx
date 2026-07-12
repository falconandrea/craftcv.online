"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Dropzone } from "@/components/ats/Dropzone";
import { ResultsDashboard, AtsScoreData } from "@/components/ats/ResultsDashboard";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Editor", href: "/editor" },
  { label: "ATS Score", href: "/ats-score" },
];

export default function AtsScorePage() {
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

      setResults(data as AtsScoreData);
      toast.success("Ready! Here is your ATS report.", {
        className: "border-[#b8ff00] bg-black text-[#b8ff00]"
      });
      
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
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-[#ff00aa] selection:text-white flex flex-col">
      <AppHeader navLinks={NAV_LINKS} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-block px-3 py-1 mb-4 rounded-full border border-[#ff00aa] bg-[#ff00aa]/10">
            <span className="text-xs font-mono font-semibold tracking-widest text-[#ff00aa] uppercase">
              AI Powered
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono tracking-tighter mb-4 text-glow">
            ATS Score <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ffd5] to-[#b8ff00]">Simulator</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Upload your CV to see how an Applicant Tracking System reads it. Discover missing keywords, formatting errors, and get actionable feedback.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="w-full max-w-2xl mb-8 p-3 bg-[#00ffd5]/10 border border-[#00ffd5]/20 rounded-md flex items-start gap-3">
          <Info className="w-5 h-5 text-[#00ffd5] shrink-0 mt-0.5" />
          <p className="text-xs text-white/70 leading-relaxed">
            <strong className="text-[#00ffd5] block mb-1">Important Disclaimer & Privacy</strong>
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
              <h3 className="text-xl font-mono font-bold tracking-widest text-white uppercase blink">Scanning Document</h3>
              <p className="text-sm text-white/50 font-mono mt-2">Extracting text & matching keywords...</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
