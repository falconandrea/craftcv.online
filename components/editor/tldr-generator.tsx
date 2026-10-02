"use client";

import { useId, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CVLanguage } from "@/state/types";

interface TldrGeneratorProps {
  inputId: string;
  value: string;
  kind: "experience" | "project";
  title: string;
  role: string;
  description: string;
  language: CVLanguage;
  onApply: (value: string) => void;
}

export function TldrGenerator({ inputId, value, kind, title, role, description, language, onApply }: TldrGeneratorProps) {
  const id = useId();
  const pending = useRef(false);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [error, setError] = useState("");
  const validProposal = proposal !== null && proposal.trim().length > 0 && proposal.length <= 200 && proposal.trim().split(/\s+/).length <= 30;

  async function generate() {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError("");
    setProposal(null);
    try {
      const response = await fetch("/api/ai/tldr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, role, description, language }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Could not generate the summary. Please try again.");
      }
      if (!data || typeof data !== "object" || !("tldr" in data) || typeof data.tldr !== "string") {
        throw new Error("AI returned an invalid summary. Please try again.");
      }
      setProposal(data.tldr);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate the summary. Please try again.");
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Label htmlFor={inputId}>TL;DR (optional)</Label>
        <div className="flex items-center gap-3">
          <span className="group relative inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs text-[#00f0ff]/70 hover:bg-[#00f0ff]/10 hover:text-[#00f0ff]"
              onClick={generate}
              disabled={loading || !description.trim() || description.length > 15000}
              aria-label={loading ? "Generating TL;DR" : "Generate TL;DR"}
              aria-describedby={`${id}-help`}
              aria-busy={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />}
              <span className="hidden sm:inline">{loading ? "Generating…" : "Generate"}</span>
            </Button>
            <span
              id={`${id}-help`}
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-64 rounded-md border border-[#00f0ff]/20 bg-[#0a0a12] p-2 text-xs text-zinc-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {!description.trim() ? "Add a description first. " : description.length > 15000 ? "Shorten the description to 15,000 characters first. " : "Generate from this entry in the CV language. "}
              Title, role and description are sent to AI.
            </span>
          </span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {value.trim() ? value.trim().split(/\s+/).length : 0}/30 words
          </span>
        </div>
      </div>
      <Input
        id={inputId}
        value={value}
        maxLength={200}
        onChange={(event) => onApply(event.target.value)}
        placeholder="One sentence: what it was, core tech, key result."
      />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {proposal !== null && (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <Label htmlFor={id}>Suggested TL;DR</Label>
          <Textarea id={id} value={proposal} maxLength={200} onChange={(event) => setProposal(event.target.value)} rows={2} />
          <p className="text-xs text-muted-foreground" aria-live="polite">{proposal.trim() ? proposal.trim().split(/\s+/).length : 0}/30 words · {proposal.length}/200 characters. Review the facts before applying.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={!validProposal} onClick={() => { onApply(proposal.trim()); setProposal(null); }}>Use this TL;DR</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setProposal(null)}>Discard</Button>
          </div>
        </div>
      )}
    </div>
  );
}
