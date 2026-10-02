"use client";

import { useId, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CVLanguage } from "@/state/types";

interface TldrGeneratorProps {
  kind: "experience" | "project";
  title: string;
  role: string;
  description: string;
  language: CVLanguage;
  onApply: (value: string) => void;
}

export function TldrGenerator({ kind, title, role, description, language, onApply }: TldrGeneratorProps) {
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
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={generate} disabled={loading || !description.trim() || description.length > 15000}>
          {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />}
          {loading ? "Generating…" : "Generate TL;DR"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {description.trim() ? "Uses this entry and the CV language." : "Add a description first."}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Title, role and description are sent to AI.</p>
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
