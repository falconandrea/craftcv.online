"use client";

import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeterministicCheck } from "@/lib/ats-rules";

export interface AtsScoreData {
  score: number;
  componentScores: {
    formatting: number;
    impact: number;
    keywordMatch: number | null;
  };
  feedback: Array<{
    category: "formatting" | "impact" | "keyword" | "missing_info";
    status: "passed" | "warning" | "failed";
    title: string;
    description: string;
  }>;
  deterministicChecks?: DeterministicCheck[];
  lintScore?: number;
}

interface ResultsDashboardProps {
  data: AtsScoreData;
  onReset: () => void;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "passed") return <CheckCircle2 className="w-5 h-5 text-[#b8ff00]" />;
  if (status === "warning") return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  return <XCircle className="w-5 h-5 text-[#ff00aa]" />;
}

const CATEGORY_LABELS: Record<string, string> = {
  contacts: "Contact Info",
  bullet_quality: "Bullet Quality",
  structure: "Document Structure",
  ats_specific: "ATS Compatibility",
};

export function ResultsDashboard({ data, onReset }: ResultsDashboardProps) {
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#b8ff00]";
    if (score >= 60) return "text-yellow-400";
    return "text-[#ff00aa]";
  };

  const scoreColor = getScoreColor(data.score);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-20">
      {/* Header / Main Score */}
      <div className="flex flex-col items-center justify-center p-8 bg-black/60 border border-white/10 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#ff00aa]/5 pointer-events-none" />
        <h2 className="text-sm font-mono tracking-[0.2em] text-white/50 uppercase mb-4">Overall ATS Readability Score</h2>
        <div className={`text-7xl font-bold font-mono tracking-tighter ${scoreColor} drop-shadow-[0_0_15px_rgba(currentColor,0.5)]`}>
          {data.score}
        </div>
        <p className="text-white/60 mt-4 text-center max-w-md">
          {data.score >= 80 ? "Excellent! Your CV is highly readable and impactful for ATS software." : data.score >= 60 ? "Good, but it needs a few tweaks to ensure it passes strict ATS filters." : "Warning: ATS parsers will likely struggle with this CV or found missing critical keywords."}
        </p>
      </div>

      {/* Component Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Formatting", score: data.componentScores.formatting },
          { label: "Impact", score: data.componentScores.impact },
          { label: "Keyword Match", score: data.componentScores.keywordMatch }
        ].map((comp, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-5 flex flex-col items-center">
            <span className="text-xs font-mono uppercase text-white/40 mb-2">{comp.label}</span>
            {comp.score === null ? (
              <span className="text-xl font-bold text-white/30">N/A</span>
            ) : (
              <span className={`text-3xl font-bold ${getScoreColor(comp.score)}`}>{comp.score}%</span>
            )}
          </div>
        ))}
      </div>

      {/* Deterministic Lint Check Section */}
      {data.deterministicChecks && data.deterministicChecks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-lg font-mono tracking-widest text-white uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00ffd5]" />
              CraftCV Lint Check
            </h3>
            {data.lintScore !== undefined && (
              <span className={`text-2xl font-bold font-mono ${getScoreColor(data.lintScore)}`}>
                {data.lintScore}%
              </span>
            )}
          </div>

          {/* Group checks by category */}
          {(["contacts", "bullet_quality", "structure", "ats_specific"] as const).map((category) => {
            const categoryChecks = data.deterministicChecks!.filter(c => c.category === category);
            if (categoryChecks.length === 0) return null;

            return (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-mono tracking-widest text-white/30 uppercase">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="space-y-2">
                  {categoryChecks.map((check, idx) => (
                    <div
                      key={`${check.id}-${idx}`}
                      className={`flex items-start p-3 rounded-lg bg-black/40 border-l-4 ${check.status === "passed"
                          ? "border-l-[#b8ff00]"
                          : check.status === "warning"
                            ? "border-l-yellow-500"
                            : "border-l-[#ff00aa]"
                        }`}
                    >
                      <div className="mr-3 mt-0.5">
                        <StatusIcon status={check.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono font-bold tracking-wider uppercase text-white/30">{check.id}</span>
                          <ChevronRight className="w-3 h-3 text-white/20 shrink-0" />
                          <h4 className="text-sm font-semibold text-white truncate">{check.label}</h4>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">{check.message}</p>
                        {check.details && (
                          <p className="text-xs text-white/40 font-mono mt-1 truncate">{check.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Feedback */}
      <div className="space-y-4">
        <h3 className="text-lg font-mono tracking-widest text-white uppercase border-b border-white/10 pb-2">AI Analysis Breakdown</h3>
        <div className="space-y-3">
          {data.feedback.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start p-4 rounded-lg bg-black/40 border-l-4 ${item.status === 'passed' ? 'border-l-[#b8ff00]' :
                  item.status === 'warning' ? 'border-l-yellow-500' : 'border-l-[#ff00aa]'
                }`}
            >
              <div className="mr-4 mt-0.5">
                <StatusIcon status={item.status} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-white/40">{item.category}</span>
                  <ChevronRight className="w-3 h-3 text-white/20" />
                  <h4 className="text-base font-semibold text-white">{item.title}</h4>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-white/10">
        <Button
          onClick={onReset}
          variant="outline"
          className="flex-1 h-12 bg-transparent border-white/20 text-white hover:text-white hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Test Another PDF
        </Button>
        <Button
          asChild
          className="flex-1 h-12 bg-[#b8ff00] text-black hover:bg-[#b8ff00]/90 font-bold tracking-widest uppercase transition-all glow-effect"
        >
          <a href="/editor">Improve in CraftCV Editor</a>
        </Button>
      </div>
    </div>
  );
}
