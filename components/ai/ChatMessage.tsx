"use client";

import { CheckCheck, X, Bot, User, Pencil, Eye, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiMessage, CVPatch, CVState } from "@/state/types";
import type { GroundingReport } from "@/lib/ai/grounding/types";
import { hasGroundingFlags } from "@/lib/ai/grounding/types";
import { summarizeChanges } from "@/lib/ai/summarize-changes";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AiDiffModal } from "./AiDiffModal";
import { useCVStore } from "@/state/store";

interface ChatMessageProps {
    message: AiMessage;
    onApply?: (changes: CVPatch) => void;
    onSkip?: (messageId: string) => void;
}

// ─── Grounding Report Panel ─────────────────────────────────────────────

function GroundingReportPanel({ report }: { report: GroundingReport }) {
    const [expanded, setExpanded] = useState(false);
    if (!hasGroundingFlags(report)) return null;

    const totalFlags =
        report.flaggedInventions.length +
        report.needsVerification.length +
        report.rejectedVerifiedEdits.length +
        report.styleWarnings.length;

    const COLLAPSE_THRESHOLD = 3;
    const shouldCollapse = totalFlags > COLLAPSE_THRESHOLD;
    const showAll = !shouldCollapse || expanded;

    let itemCount = 0;

    return (
        <div className="w-full rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/5 overflow-hidden">
            <div className="px-3 py-2 border-b border-[#00f0ff]/15 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-mono text-[#00f0ff]">
                    <ShieldAlert className="h-3 w-3" />
                    GROUNDING_REPORT
                    <span className="text-[10px] text-zinc-500 ml-1">
                        ({totalFlags} flag{totalFlags !== 1 ? "s" : ""})
                    </span>
                </p>
                {shouldCollapse && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono flex items-center gap-1"
                    >
                        {expanded ? (
                            <><ChevronUp className="h-3 w-3" /> collapse</>
                        ) : (
                            <><ChevronDown className="h-3 w-3" /> show {totalFlags - COLLAPSE_THRESHOLD} more</>
                        )}
                    </button>
                )}
            </div>
            <ul className="px-3 py-2 space-y-1.5">
                {report.flaggedInventions.map((flag, i) => {
                    itemCount++;
                    if (!showAll && itemCount > COLLAPSE_THRESHOLD) return null;
                    return (
                        <li key={`inv-${i}`} className="flex items-start gap-2 text-xs font-mono">
                            <span className="mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-[#ff00aa]/15 text-[#ff00aa] border border-[#ff00aa]/20">
                                INVENTION
                            </span>
                            <span className="text-zinc-400">
                                &quot;{flag.term}&quot; — <span className="text-zinc-500">{flag.message}</span>
                            </span>
                        </li>
                    );
                })}
                {report.needsVerification.map((flag, i) => {
                    itemCount++;
                    if (!showAll && itemCount > COLLAPSE_THRESHOLD) return null;
                    return (
                        <li key={`ver-${i}`} className="flex items-start gap-2 text-xs font-mono">
                            <span className="mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> VERIFY
                            </span>
                            <span className="text-zinc-400">
                                &quot;{flag.proposed}&quot; — <span className="text-zinc-500">{flag.message}</span>
                            </span>
                        </li>
                    );
                })}
                {report.rejectedVerifiedEdits.map((flag, i) => {
                    itemCount++;
                    if (!showAll && itemCount > COLLAPSE_THRESHOLD) return null;
                    return (
                        <li key={`rej-${i}`} className="flex items-start gap-2 text-xs font-mono">
                            <span className="mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-zinc-700/50 text-zinc-500 border border-zinc-700/30">
                                PROTECTED
                            </span>
                            <span className="text-zinc-500 line-through">
                                &quot;{flag.fact.value}&quot; → &quot;{flag.proposed}&quot;
                            </span>
                            <span className="text-zinc-600">— blocked</span>
                        </li>
                    );
                })}
                {report.styleWarnings.map((flag, i) => {
                    itemCount++;
                    if (!showAll && itemCount > COLLAPSE_THRESHOLD) return null;
                    return (
                        <li key={`sty-${i}`} className="flex items-start gap-2 text-xs font-mono">
                            <span className="mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800/60 text-zinc-500 border border-zinc-700/30">
                                STYLE
                            </span>
                            <span className="text-zinc-500">{flag.message}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function getEffectivePatch(patch: CVPatch, currentCV: CVState): CVPatch {
    const effectivePatch: CVPatch = {};
    const isDifferent = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

    if (patch.summary !== undefined && isDifferent(patch.summary, currentCV.summary)) {
        effectivePatch.summary = patch.summary;
    }
    if (patch.skills !== undefined && isDifferent(patch.skills, currentCV.skills)) {
        effectivePatch.skills = patch.skills;
    }
    if (patch.experience !== undefined && isDifferent(patch.experience, currentCV.experience)) {
        effectivePatch.experience = patch.experience;
    }
    if (patch.education !== undefined && isDifferent(patch.education, currentCV.education)) {
        effectivePatch.education = patch.education;
    }
    if (patch.projects !== undefined && isDifferent(patch.projects, currentCV.projects)) {
        effectivePatch.projects = patch.projects;
    }
    if (patch.certifications !== undefined && isDifferent(patch.certifications, currentCV.certifications)) {
        effectivePatch.certifications = patch.certifications;
    }
    if (patch.languages !== undefined && isDifferent(patch.languages, currentCV.languages)) {
        effectivePatch.languages = patch.languages;
    }
    if (patch.customSection !== undefined && isDifferent(patch.customSection, currentCV.customSection)) {
        effectivePatch.customSection = patch.customSection;
    }

    return effectivePatch;
}

export function ChatMessage({ message, onApply, onSkip }: ChatMessageProps) {
    const isUser = message.role === "user";
    const cv = useCVStore();

    const effectivePatch = message.proposedChanges
        ? getEffectivePatch(message.proposedChanges, cv)
        : undefined;

    const hasPendingChanges =
        effectivePatch && Object.keys(effectivePatch).length > 0 && message.changeStatus === "pending";

    const changeSummary = hasPendingChanges
        ? summarizeChanges(effectivePatch, cv)
        : [];

    const [isDiffOpen, setIsDiffOpen] = useState(false);

    return (
        <div className={cn("flex flex-col gap-2 w-full", isUser ? "items-end" : "items-start")}>
            <div className={cn("flex gap-2.5 w-full", isUser ? "flex-row-reverse" : "flex-row")}>
                {/* Avatar */}
                <div
                    className={cn(
                        "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded",
                        isUser
                            ? "bg-[#ff00aa]/15 text-[#ff00aa] border border-[#ff00aa]/20"
                            : "bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20"
                    )}
                >
                    {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                {/* Bubble */}
                <div className={cn("flex max-w-[80%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
                    <div
                        className={cn(
                            "rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap font-mono",
                            isUser
                                ? "bg-[#ff00aa]/10 text-zinc-200 border border-[#ff00aa]/20 rounded-tr-sm"
                                : "bg-[#050508] border border-zinc-800/60 text-zinc-300 rounded-tl-sm"
                        )}
                    >
                        {message.content}
                    </div>

                    {/* Proposed changes: summary + actions */}
                    {hasPendingChanges && (
                        <div className="w-full rounded-lg border border-[#b8ff00]/20 bg-[#b8ff00]/5 overflow-hidden">
                            {/* Change summary list */}
                            {changeSummary.length > 0 && (
                                <div className="px-3 pt-2.5 pb-1.5 border-b border-[#b8ff00]/15">
                                    <p className="flex items-center gap-1.5 text-xs font-mono text-[#b8ff00] mb-1.5">
                                        <Pencil className="h-3 w-3" />
                                        PROPOSED_CHANGES
                                    </p>
                                    <ul className="space-y-0.5">
                                        {changeSummary.map((line, i) => (
                                            <li key={i} className="text-xs text-zinc-400 font-mono">
                                                {line}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-col gap-2 px-3 py-2">
                                {/* View Details */}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1.5 text-xs px-3 w-full font-mono border-zinc-700/50 text-zinc-300 bg-transparent hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] hover:border-[#00f0ff]/30"
                                    onClick={() => setIsDiffOpen(true)}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    VIEW_DIFF
                                </Button>
                                {/* Apply and Skip */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 gap-1.5 bg-[#b8ff00]/15 hover:bg-[#b8ff00]/25 text-[#b8ff00] border border-[#b8ff00]/30 text-xs px-3 flex-1 font-mono"
                                        onClick={() => onApply?.(effectivePatch!)}
                                    >
                                        <CheckCheck className="h-3.5 w-3.5" />
                                        APPLY
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1.5 text-xs px-3 text-[#ff00aa] hover:text-[#ff00aa] hover:bg-[#ff00aa]/10 border-[#ff00aa]/20 hover:border-[#ff00aa]/30 flex-1 font-mono bg-transparent"
                                        onClick={() => onSkip?.(message.id)}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        SKIP
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Applied / Skipped badge */}
                    {message.changeStatus === "applied" && (
                        <span className="flex items-center gap-1 text-[10px] text-[#b8ff00] font-mono">
                            <CheckCheck className="h-3 w-3" /> CHANGES_APPLIED
                        </span>
                    )}
                    {message.changeStatus === "skipped" && (
                        <span className="text-[10px] text-zinc-600 font-mono">CHANGES_SKIPPED</span>
                    )}
                </div>
            </div>

            {hasPendingChanges && effectivePatch && (
                <AiDiffModal
                    open={isDiffOpen}
                    onOpenChange={setIsDiffOpen}
                    currentCV={cv}
                    patch={effectivePatch}
                    onApply={() => onApply?.(effectivePatch!)}
                    groundingReport={message.groundingReport}
                />
            )}

            {/* Grounding report panel */}
            {message.groundingReport && hasGroundingFlags(message.groundingReport) && (
                <div className={cn("w-full max-w-[80%]", isUser ? "mr-9" : "ml-9")}>
                    <GroundingReportPanel report={message.groundingReport} />
                </div>
            )}
        </div>
    );
}
