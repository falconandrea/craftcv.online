"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { EditorContent } from "@/components/editor/editor-content";
import { PdfImportDialog } from "@/components/editor/pdf-import-dialog";
import { AiOptimizePanel, INITIAL_AI_MESSAGE } from "@/components/ai/AiOptimizePanel";
import type { AiMessage } from "@/state/types";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileDown,
  FileUp,
  FileJson,
  FileText,
  Sparkles,
  Terminal,
  Code2,
  Eye,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useCVStore } from "@/state/store";
import { generateAndDownloadPDF } from "@/lib/pdf-generator";
import { exportCVAsJSON, importCVFromJSON } from "@/lib/json-handler";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PreviewContent = dynamic(
  () => import("@/components/editor/preview-content").then((mod) => mod.PreviewContent),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3">
        <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
        <span className="text-xs font-mono">LOADING_PREVIEW...</span>
      </div>
    )
  }
);

function PreviewLoader() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3">
      <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
      <span className="text-xs font-mono">LOADING_PREVIEW...</span>
    </div>
  );
}

type EditorMode = "editor" | "preview";

export default function EditorPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<AiMessage[]>([INITIAL_AI_MESSAGE]);
  const [importPopoverOpen, setImportPopoverOpen] = useState(false);
  const [pdfImportOpen, setPdfImportOpen] = useState(false);

  // IDE mode toggle: editor or preview
  const [activeMode, setActiveMode] = useState<EditorMode>("editor");
  const [aiSheetOpen, setAiSheetOpen] = useState(false);

  // Selector slices for optimal re-renders
  const personalInfo = useCVStore((state) => state.personalInfo);
  const summary = useCVStore((state) => state.summary);
  const experience = useCVStore((state) => state.experience);
  const skills = useCVStore((state) => state.skills);
  const education = useCVStore((state) => state.education);
  const certifications = useCVStore((state) => state.certifications);
  const projects = useCVStore((state) => state.projects);
  const languages = useCVStore((state) => state.languages);
  const customSection = useCVStore((state) => state.customSection);
  const cvLanguage = useCVStore((state) => state.cvLanguage);

  // Actions
  const setPersonalInfo = useCVStore((state) => state.setPersonalInfo);
  const setSummary = useCVStore((state) => state.setSummary);
  const setExperience = useCVStore((state) => state.setExperience);
  const setSkills = useCVStore((state) => state.setSkills);
  const setCertifications = useCVStore((state) => state.setCertifications);
  const setProjects = useCVStore((state) => state.setProjects);
  const setEducation = useCVStore((state) => state.setEducation);
  const setLanguages = useCVStore((state) => state.setLanguages);
  const setCustomSection = useCVStore((state) => state.setCustomSection);

  // AI Optimize
  const isAiEnabled =
    personalInfo.fullName.trim().length > 0 ||
    personalInfo.email.trim().length > 0;

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const filename =
        `${personalInfo.fullName.replace(/\s+/g, "-")}-cv.pdf` || "cv.pdf";
      await generateAndDownloadPDF({ personalInfo, summary, experience, skills, certifications, projects, education, languages, customSection, cvLanguage }, filename);

      // Track the generation anonymously
      fetch("/api/stats/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: "cv_created" }),
      }).catch((e) => console.error("Telemetry failed:", e));

    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const filename =
        `${personalInfo.fullName.replace(/\s+/g, "-")}-cv-data.json` ||
        "cv-data.json";
      exportCVAsJSON({ personalInfo, summary, experience, skills, certifications, projects, education, languages, customSection, cvLanguage }, filename);
    } catch (error) {
      console.error("Failed to export JSON:", error);
      toast.error("Failed to export CV data. Please try again.");
    }
  };

  const handleImportJSONClick = () => {
    document.getElementById("json-import-input")?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importCVFromJSON(file, (data) => {
        setPersonalInfo(data.personalInfo);
        setSummary(data.summary);
        setExperience(data.experience);
        setSkills(data.skills);
        setCertifications(data.certifications);
        setProjects(data.projects);
        setEducation(data.education);
        if (data.languages) setLanguages(data.languages);
        if (data.customSection) setCustomSection(data.customSection);
      });
      toast.success("CV data imported successfully!");
    } catch (error) {
      console.error("Failed to import JSON:", error);
      toast.error("Failed to import CV data.");
    }
    e.target.value = "";
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col editor-cyber dark">
      {/* Background Grid */}
      <div className="fixed inset-0 retro-grid pointer-events-none" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.04) 0%, transparent 60%)",
        }}
      />

      <AppHeader
        navLinks={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Editor", href: "/editor" },
          { label: "ATS Score", href: "/ats-score" },
        ]}
      />

      {/* Hidden file input */}
      <input
        id="json-import-input"
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ── Sticky sub-header: IDE toggle + action buttons ── */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/60 bg-[#0a0a12]/90 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-2 py-2">
            {/* Left: IDE Mode Toggle + Import */}
            <div className="flex items-center gap-3">
              {/* IDE Mode Toggle */}
              <div className="flex items-center rounded-md border border-zinc-700/50 bg-[#050508] p-0.5">
                <button
                  onClick={() => setActiveMode("editor")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-mono transition-all",
                    activeMode === "editor"
                      ? "bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Editor</span>
                </button>
                <button
                  onClick={() => setActiveMode("preview")}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-mono transition-all",
                    activeMode === "preview"
                      ? "bg-[#ff00aa]/10 text-[#ff00aa] border border-[#ff00aa]/30 shadow-[0_0_8px_rgba(255,0,170,0.15)]"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              </div>

              {/* Save JSON */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="gap-1.5 border-zinc-700/50 bg-transparent text-zinc-400 hover:text-[#00f0ff] hover:border-[#00f0ff]/30 hover:bg-[#00f0ff]/5 font-mono text-xs"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden md:inline">SAVE_JSON</span>
              </Button>

              {/* Import */}
              <Popover open={importPopoverOpen} onOpenChange={setImportPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-zinc-700/50 bg-transparent text-zinc-400 hover:text-[#b8ff00] hover:border-[#b8ff00]/30 hover:bg-[#b8ff00]/5 font-mono text-xs"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">IMPORT</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5 bg-[#0a0a12] border-zinc-700/50" align="start">
                  <button
                    onClick={() => {
                      setImportPopoverOpen(false);
                      setPdfImportOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-[#ff00aa]/10 hover:text-[#ff00aa] transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    IMPORT_PDF
                  </button>
                  <button
                    onClick={() => {
                      setImportPopoverOpen(false);
                      handleImportJSONClick();
                    }}
                    className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-[#b8ff00]/10 hover:text-[#b8ff00] transition-colors"
                  >
                    <FileJson className="h-3.5 w-3.5" />
                    IMPORT_JSON
                  </button>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: AI + Download */}
            <div className="flex items-center gap-2">
              {/* AI Co-Pilot Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiSheetOpen(true)}
                disabled={!isAiEnabled}
                title={!isAiEnabled ? "Fill personal info first" : undefined}
                className={cn(
                  "gap-1.5 font-mono text-xs border-[#ff00aa]/30 text-[#ff00aa] hover:bg-[#ff00aa]/10 hover:border-[#ff00aa]/50 bg-transparent",
                  !isAiEnabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI_COACH</span>
              </Button>

              {/* Download PDF */}
              <Button
                size="sm"
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="gap-1.5 bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 hover:bg-[#00f0ff]/20 hover:shadow-[0_0_12px_rgba(0,240,255,0.2)] font-mono text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                {isGenerating ? "GENERATING..." : "DOWNLOAD_PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area (narrower centered pane) ── */}
      <div className="relative z-10 flex-1">
        <div className="max-w-3xl w-full mx-auto px-4 py-4">
          <main>
            <div className="bg-[#0a0a12]/80 border border-zinc-800/50 rounded-lg">
              {activeMode === "editor" ? (
                <div className="p-6 pt-0">
                  <EditorContent
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                  />
                </div>
              ) : (
                <div className="bg-zinc-100 rounded-lg">
                  <Suspense fallback={<PreviewLoader />}>
                    <PreviewContent />
                  </Suspense>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── AI Chat Sheet (Terminal Overlay) ── */}
      <Sheet open={aiSheetOpen} onOpenChange={setAiSheetOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:w-[450px] p-0 flex flex-col bg-[#0a0a12] border-l border-[#00f0ff]/20"
        >
          <SheetHeader className="px-4 py-3 border-b border-zinc-800/60 shrink-0 flex flex-row items-center justify-between bg-[#050508]">
            <SheetTitle className="flex items-center gap-2 text-[#00f0ff] font-mono text-sm">
              <Terminal className="w-4 h-4" />
              <span>AI_COACH.EXE</span>
            </SheetTitle>
            <SheetClose className="rounded-sm p-1 text-zinc-400 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-hidden p-4 pt-0">
            <AiOptimizePanel
              messages={chatMessages}
              onMessagesChange={setChatMessages}
              onLoadingChange={setIsAiLoading}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <PdfImportDialog open={pdfImportOpen} onOpenChange={setPdfImportOpen} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
