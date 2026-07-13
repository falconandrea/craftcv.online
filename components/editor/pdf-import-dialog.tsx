"use client";

import { useRef, useState, useCallback } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCVStore } from "@/state/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CVState } from "@/state/types";

interface PdfImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalizeLinks(links: string[]): string[] {
  return links
    .map((link) => {
      const trimmed = link.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
      }

      if (trimmed.startsWith("/in/")) {
        return `https://linkedin.com${trimmed}`;
      }

      if (trimmed.startsWith("/")) {
        return null;
      }

      const username = trimmed.replace(/\/$/, "");
      if (username && !username.includes(".") && !username.includes(" ")) {
        return `https://github.com/${username}`;
      }

      return null;
    })
    .filter((link): link is string => link !== null);
}

export function PdfImportDialog({ open, onOpenChange }: PdfImportDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cv = useCVStore();

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 5 MB.");
        return;
      }

      setIsLoading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/ai/import-pdf", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error || "Failed to process PDF.");
          return;
        }

        const data = json.data as Partial<CVState>;

        // Normalize links before saving
        if (data.personalInfo?.links) {
          data.personalInfo.links = normalizeLinks(data.personalInfo.links);
        }

        // Populate the store
        if (data.personalInfo) cv.setPersonalInfo(data.personalInfo);
        if (data.summary) cv.setSummary(data.summary);
        if (data.experience) cv.setExperience(data.experience);
        if (data.skills) cv.setSkills(data.skills);
        if (data.certifications) cv.setCertifications(data.certifications);
        if (data.projects) cv.setProjects(data.projects);
        if (data.education) cv.setEducation(data.education);
        if (data.languages) cv.setLanguages(data.languages);

        toast.success(
          "CV imported successfully! Review the data and make any adjustments."
        );
        onOpenChange(false);
      } catch (error) {
        console.error("PDF import failed:", error);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [cv, onOpenChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6 bg-[#0a0a12] border-zinc-700/50 text-white">
        <DialogHeader className="mx-0 mb-4">
          <DialogTitle className="text-lg font-bold font-mono text-[#00f0ff]">IMPORT_FROM_PDF</DialogTitle>
          <DialogDescription className="mt-2 text-zinc-400 text-sm">
            Upload your existing CV in PDF format to auto-fill the fields
          </DialogDescription>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "p-6 rounded-lg border-2 border-dashed transition-all duration-200",
            isDragOver
              ? "border-[#00f0ff]/50 bg-[#00f0ff]/5"
              : "border-zinc-700 bg-zinc-900/30",
            isLoading && "pointer-events-none opacity-60"
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
              <p className="text-sm font-medium text-[#00f0ff] font-mono">
                Analyzing your CV...
              </p>
              <p className="text-xs text-zinc-500">
                Extracting data with AI — this may take a few seconds
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                <Upload className="h-6 w-6 text-[#00f0ff]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-200">
                  Auto-fill your CV by uploading an existing PDF
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Drag & drop your PDF here, or click the button below
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 hover:text-[#00f0ff] hover:border-[#00f0ff]/50 bg-transparent font-mono text-xs"
              >
                <FileUp className="h-4 w-4" />
                UPLOAD_PDF
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          id="pdf-import-input"
        />

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center font-mono">
            Supports PDF files up to 5MB
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}