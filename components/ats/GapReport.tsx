"use client";

import { CheckCircle2, XCircle, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GapReport, KeywordMatchDetail } from "@/lib/jd-types";

interface GapReportProps {
  gapReport: GapReport;
}

const CATEGORY_COLORS: Record<string, string> = {
  technology: "text-[#00ffd5] border-[#00ffd5]/30 bg-[#00ffd5]/10",
  tool: "text-[#b8ff00] border-[#b8ff00]/30 bg-[#b8ff00]/10",
  platform: "text-[#00f0ff] border-[#00f0ff]/30 bg-[#00f0ff]/10",
  methodology: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  other: "text-white/50 border-white/20 bg-white/5",
};

export function GapReport({ gapReport }: GapReportProps) {
  const { keywordScore, totalMustHave, presentMustHave, present, missing, topGaps } = gapReport;

  const hasGaps = missing.length > 0;
  const hasData = present.length > 0 || missing.length > 0;

  // Score color
  const scoreColor =
    keywordScore === null
      ? "text-white/30"
      : keywordScore >= 80
        ? "text-[#b8ff00]"
        : keywordScore >= 50
          ? "text-yellow-400"
          : "text-[#ff00aa]";

  // Headline text
  const headline =
    totalMustHave > 0
      ? `${presentMustHave} of ${totalMustHave} must-have skills found`
      : `${present.length} skills matched`;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h3 className="text-lg font-mono tracking-widest text-white uppercase flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#b8ff00]" />
          Keyword Gap Analysis
        </h3>
        {hasData && (
          <span
            className={`text-2xl font-bold font-mono ${scoreColor}`}
            title={
              keywordScore === null
                ? "The posting lists no must-have skills, so there is nothing to score against."
                : undefined
            }
          >
            {keywordScore === null ? "N/A" : `${keywordScore}%`}
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm font-mono text-white/40 py-4 text-center border border-white/10 rounded-lg bg-black/40">
          No keywords could be extracted from the job description.
        </p>
      ) : (
        <>
          {/* Headline Stat */}
          <div
            className={`p-4 rounded-lg border text-center ${
              hasGaps
                ? "bg-[#ff00aa]/10 border-[#ff00aa]/20"
                : "bg-[#b8ff00]/10 border-[#b8ff00]/20"
            }`}
          >
            <p
              className={`text-lg font-bold font-mono ${
                hasGaps ? "text-[#ff00aa]" : "text-[#b8ff00]"
              }`}
            >
              {headline}
            </p>
            {hasGaps && (
              <p className="text-sm text-white/60 mt-1 font-mono">
                {missing.length} skill{missing.length !== 1 ? "s" : ""} missing{" "}
                {topGaps.length > 0 && (
                  <span>
                    — top gap{topGaps.length !== 1 ? "s" : ""}:{" "}
                    {topGaps
                      .slice(0, 3)
                      .map((g) => g.keyword)
                      .join(", ")}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Two-Column Grid: Present / Missing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Present Column */}
            <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-mono tracking-widest text-[#b8ff00] uppercase flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Present ({present.length})
              </h4>
              {present.length === 0 ? (
                <p className="text-xs font-mono text-white/30 text-center py-3">
                  No skills matched
                </p>
              ) : (
                <div className="space-y-2">
                  {present.map((item, idx) => (
                    <KeywordItem key={`present-${idx}`} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Missing Column */}
            <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-mono tracking-widest text-[#ff00aa] uppercase flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5" />
                Missing ({missing.length})
              </h4>
              {missing.length === 0 ? (
                <p className="text-xs font-mono text-white/30 text-center py-3">
                  No skills missing
                </p>
              ) : (
                <div className="space-y-2">
                  {missing.map((item, idx) => (
                    <KeywordItem key={`missing-${idx}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fix in Editor CTA */}
          {hasGaps && (
            <Button
              asChild
              className="w-full h-12 bg-[#b8ff00] text-black hover:bg-[#b8ff00]/90 font-bold tracking-widest uppercase transition-all glow-effect"
            >
              <a href="/editor?ai=open">
                Open Editor &amp; Launch AI Coach <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}

          {/* Context note */}
          <p className="text-xs font-mono text-white/40 text-center">
            Once in the editor, click <span className="text-[#ff00aa] font-bold">AI_COACH</span> (top-right) and paste the job description to get targeted rewrites.
          </p>
        </>
      )}
    </div>
  );
}

function KeywordItem({ item }: { item: KeywordMatchDetail }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-white/5 border border-white/5">
      <div className="mt-0.5 shrink-0">
        {item.status === "present" ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-[#b8ff00]" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-[#ff00aa]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-white truncate">{item.keyword}</span>
          {/* Importance badge */}
          {item.importance === "must_have" ? (
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-500/10 leading-none">
              Required
            </span>
          ) : (
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-white/20 text-white/40 bg-white/5 leading-none">
              Preferred
            </span>
          )}
          {/* Category badge */}
          <span
            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border leading-none ${
              CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other
            }`}
          >
            {item.category}
          </span>
        </div>
        {item.context && (
          <p className="text-xs text-white/40 font-mono mt-0.5 truncate">
            <ChevronRight className="w-3 h-3 inline-block mr-0.5 text-white/20" />
            {item.context}
          </p>
        )}
      </div>
    </div>
  );
}
