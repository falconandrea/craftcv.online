"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PrivacyNotice } from "./PrivacyNotice";
import { ChatMessage } from "./ChatMessage";
import type { AiMessage, CVPatch } from "@/state/types";
import type { CVState } from "@/state/types";
import { sendAiMessage, type ApiMessage } from "@/lib/ai-client";
import { useCVStore } from "@/state/store";

export const INITIAL_AI_MESSAGE: AiMessage = {
    id: "initial",
    role: "assistant",
    content:
        "Hi! Paste the job description you're targeting, or just tell me what you'd like to improve in your CV.",
};

interface AiOptimizePanelProps {
    messages: AiMessage[];
    onMessagesChange: (messages: AiMessage[]) => void;
    onLoadingChange?: (loading: boolean) => void;
}

export function AiOptimizePanel({ messages, onMessagesChange, onLoadingChange }: AiOptimizePanelProps) {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Selector slices for optimal re-renders
    const personalInfo = useCVStore((state) => state.personalInfo);
    const summary = useCVStore((state) => state.summary);
    const experience = useCVStore((state) => state.experience);
    const skills = useCVStore((state) => state.skills);
    const certifications = useCVStore((state) => state.certifications);
    const projects = useCVStore((state) => state.projects);
    const education = useCVStore((state) => state.education);
    const languages = useCVStore((state) => state.languages);
    const customSection = useCVStore((state) => state.customSection);
    const cvLanguage = useCVStore((state) => state.cvLanguage);
    const applyAiPatch = useCVStore((state) => state.applyAiPatch);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const buildApiHistory = useCallback((msgs: AiMessage[]): ApiMessage[] => {
        return msgs
            .filter((m) => m.id !== "initial")
            .map((m) => ({ role: m.role, content: m.content }));
    }, []);

    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage: AiMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmed,
        };

        const updatedMessages = [...messages, userMessage];
        onMessagesChange(updatedMessages);
        setInput("");
        setIsLoading(true);
        onLoadingChange?.(true);

        try {
            const history = buildApiHistory(updatedMessages);
            const cvSnapshot: CVState = {
                personalInfo,
                summary,
                experience,
                skills,
                certifications,
                projects,
                education,
                languages,
                customSection,
                cvLanguage,
            };

            const response = await sendAiMessage(history, cvSnapshot);

            const assistantMessage: AiMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: response.error ? `⚠️ ${response.error}` : response.content,
                proposedChanges: response.error ? undefined : (response.proposedChanges as CVPatch | undefined),
                changeStatus: response.proposedChanges && !response.error ? "pending" : undefined,
            };

            onMessagesChange([...updatedMessages, assistantMessage]);
        } catch {
            onMessagesChange([
                ...updatedMessages,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: "⚠️ Something went wrong. Please check your AI provider configuration and try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
            onLoadingChange?.(false);
        }
    }, [input, isLoading, messages, buildApiHistory, personalInfo, summary, experience, skills, certifications, projects, education, languages, customSection, cvLanguage, onLoadingChange, onMessagesChange]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleApply = useCallback((changes: CVPatch, messageId: string) => {
        applyAiPatch(changes);
        onMessagesChange(
            messages.map((m) => (m.id === messageId ? { ...m, changeStatus: "applied" } : m))
        );
    }, [applyAiPatch, messages, onMessagesChange]);

    const handleSkip = useCallback((messageId: string) => {
        onMessagesChange(
            messages.map((m) => (m.id === messageId ? { ...m, changeStatus: "skipped" } : m))
        );
    }, [messages, onMessagesChange]);

    return (
        <div className="flex flex-col h-full px-1">
            {/* Privacy notice */}
            <div className="mb-3">
                <PrivacyNotice />
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2 min-h-0 pl-1">
                {messages.map((msg) => (
                    <ChatMessage
                        key={msg.id}
                        message={msg}
                        onApply={(changes) => handleApply(changes, msg.id)}
                        onSkip={handleSkip}
                    />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex items-center gap-2 text-xs text-[#00f0ff] font-mono">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>PROCESSING_REQUEST...</span>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-zinc-800/60 pt-3 mt-2 px-1">
                <div className="flex gap-2 items-end">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask the AI or paste a job description…"
                        className="min-h-[60px] max-h-[160px] resize-none text-sm bg-[#050508] border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 focus:border-[#00f0ff] focus:ring-0 font-mono"
                        disabled={isLoading}
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="shrink-0 h-10 w-10 bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-zinc-600 font-mono">
                    <kbd className="px-1 py-0.5 rounded border border-zinc-800 text-zinc-500 font-mono">Enter</kbd> send · <kbd className="px-1 py-0.5 rounded border border-zinc-800 text-zinc-500 font-mono">Shift+Enter</kbd> new line
                </p>
            </div>
        </div>
    );
}
