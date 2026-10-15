"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCVStore } from "@/state/store";
import type { CVLanguage } from "@/state/types";
import { markEditorStarted } from "@/lib/analytics";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const cvLanguage = useCVStore((state) => state.cvLanguage);
  const setCVLanguage = useCVStore((state) => state.setCVLanguage);
  const [draftLanguage, setDraftLanguage] = useState<CVLanguage | null>(null);
  const [seededOpen, setSeededOpen] = useState(false);

  // Re-seed the draft from the store at every open transition, including when
  // `open` is set directly by the parent (Radix never fires onOpenChange(true)
  // without a DialogTrigger). Closing paths (Cancel/Escape/outside) leave the
  // stale draft behind but never show it: the store is written exclusively by
  // handleSave and every reopen re-seeds from it.
  if (open !== seededOpen) {
    setSeededOpen(open);
    if (open) {
      setDraftLanguage(cvLanguage ?? "en");
    }
  }

  const handleSave = () => {
    if (draftLanguage) {
      const languageChanged = draftLanguage !== (cvLanguage ?? "en");
      setCVLanguage(draftLanguage);
      if (languageChanged) markEditorStarted();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-[#0a0a12] border-zinc-700/50 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-[#00f0ff]">
            <Settings className="h-4 w-4" />
            SETTINGS
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Used for the PDF and changes proposed by AI Coach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cv-language-select">CV language</Label>
          <Select
            value={draftLanguage ?? "en"}
            onValueChange={(value) => setDraftLanguage(value as CVLanguage)}
          >
            <SelectTrigger id="cv-language-select" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="it">Italiano</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-mono text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20 hover:shadow-[0_0_12px_rgba(0,240,255,0.2)] font-mono text-xs"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

