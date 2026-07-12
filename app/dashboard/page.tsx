"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import {
  Plus,
  FileUp,
  Code2,
  FileText,
  Lock,
  Sparkles,
  Terminal,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useCVStore } from "@/state/store";
import { importCVFromJSON } from "@/lib/json-handler";
import { toast } from "sonner";
import type { CVState } from "@/state/types";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Editor", href: "/editor" },
  { label: "ATS Score", href: "/ats-score" },
];

/**
 * Normalize links extracted from PDF import
 * Reused from pdf-import-dialog.tsx logic
 */
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

export default function DashboardPage() {
  const router = useRouter();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Zustand store actions
  const cv = useCVStore();

  // ── PDF Import Flow ──
  const processPdfFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 5 MB.");
        return;
      }

      setIsPdfLoading(true);
      toast.info("Analyzing your CV with AI... This may take a few seconds.");

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

        toast.success("CV imported successfully!");
        router.push("/editor");
      } catch (error) {
        console.error("PDF import failed:", error);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsPdfLoading(false);
      }
    },
    [cv, router]
  );

  const handlePdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPdfFile(file);
    e.target.value = "";
  };

  // ── JSON Import Flow ──
  const handleJsonInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await importCVFromJSON(file, (data) => {
        cv.setPersonalInfo(data.personalInfo);
        cv.setSummary(data.summary);
        cv.setExperience(data.experience);
        cv.setSkills(data.skills);
        cv.setCertifications(data.certifications);
        cv.setProjects(data.projects);
        cv.setEducation(data.education);
        if (data.languages) cv.setLanguages(data.languages);
        if (data.customSection) cv.setCustomSection(data.customSection);
      });
      toast.success("CV data imported successfully!");
      router.push("/editor");
    } catch (error) {
      console.error("Failed to import JSON:", error);
      toast.error("Failed to import CV data. Check the file format.");
    }

    e.target.value = "";
  };

  // ── Action Cards Config ──
  const cards = [
    {
      id: "scratch",
      title: "Start from Scratch",
      description:
        "Start from zero. Fill in your details step by step using our guided editor.",
      icon: Plus,
      accent: "#00f0ff",
      cta: "INITIALIZE_WORKSPACE",
      onClick: () => router.push("/editor"),
      large: true,
    },
    {
      id: "pdf",
      title: "Import from PDF",
      description:
        "Upload an existing CV in PDF format. Our AI will extract and auto-fill all fields.",
      icon: FileUp,
      accent: "#ff00aa",
      cta: "UPLOAD_DOCUMENT",
      onClick: () => pdfInputRef.current?.click(),
      large: false,
    },
    {
      id: "json",
      title: "Import from JSON",
      description:
        "Restore a previously saved CV from a CraftCV JSON backup file.",
      icon: Code2,
      accent: "#b8ff00",
      cta: "RESTORE_BACKUP",
      onClick: () => jsonInputRef.current?.click(),
      large: false,
    },
  ];

  const infoBadges = [
    {
      label: "ATS_COMPLIANT",
      value: "ATS Compliant Output",
      icon: FileText,
      accent: "#00f0ff",
    },
    {
      label: "DATA_PRIVACY",
      value: "Encrypted Data Privacy",
      icon: Lock,
      accent: "#ff00aa",
    },
    {
      label: "AI_COACHING",
      value: "Real-time AI Coaching",
      icon: Sparkles,
      accent: "#b8ff00",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#050508] text-white overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 retro-grid pointer-events-none" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <AppHeader navLinks={NAV_LINKS} />

      {/* Hidden file inputs */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        onChange={handlePdfInputChange}
        className="hidden"
        id="dashboard-pdf-input"
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonInputChange}
        className="hidden"
        id="dashboard-json-input"
      />

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-4 py-16 md:py-24">
        <div className="container mx-auto max-w-5xl">
          {/* Hero Section */}
          <div className="mb-16">
            <div
              className="inline-flex items-center gap-2 text-[#00f0ff] font-mono text-sm mb-6"
              style={{
                animation: "fade-in-up 0.6s ease-out forwards",
                opacity: 0,
              }}
            >
              <Terminal className="w-4 h-4" />
              <span>WORKSPACE.READY</span>
            </div>

            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
              style={{
                animation: "fade-in-up 0.6s ease-out 0.1s forwards",
                opacity: 0,
              }}
            >
              <span className="text-zinc-100">Initialize your</span>
              <br />
              <span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#ff00aa]"
                style={{ textShadow: "0 0 60px rgba(0,240,255,0.5)" }}
              >
                workspace
              </span>
              <br />
              <span className="text-zinc-400 text-3xl md:text-5xl">
                and start building
              </span>
            </h1>

            <p
              className="text-zinc-400 font-mono text-sm leading-relaxed max-w-xl"
              style={{
                animation: "fade-in-up 0.6s ease-out 0.2s forwards",
                opacity: 0,
              }}
            >
              <span className="text-[#00f0ff]">$</span> select a module to begin
              <br />
              <span className="text-[#ff00aa]">$</span> AI models standby for document extraction
              <br />
              <span className="text-[#b8ff00]">$</span> local storage systems active
            </p>
          </div>

          {/* Loading Overlay */}
          {isPdfLoading && (
            <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-[#ff00aa] animate-spin" />
              <p className="text-zinc-300 font-mono text-sm">
                Analyzing your CV with AI...
              </p>
              <p className="text-zinc-500 font-mono text-xs">
                This may take a few seconds
              </p>
            </div>
          )}

          {/* Action Cards Grid */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-20"
            style={{
              animation: "fade-in-up 0.6s ease-out 0.3s forwards",
              opacity: 0,
            }}
          >
            {/* Left: Start from Scratch (tall card) */}
            <div
              className="group bg-[#0a0a12] border border-zinc-800 hover:border-[#00f0ff] p-8 lg:p-10 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between lg:row-span-2"
              onClick={cards[0].onClick}
            >
              <div>
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center mb-8 transition-all duration-300"
                  style={{
                    backgroundColor: `${cards[0].accent}15`,
                    color: cards[0].accent,
                  }}
                >
                  <Plus className="w-7 h-7" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-white group-hover:text-[#00f0ff] transition-colors">
                  {cards[0].title}
                </h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                  {cards[0].description}
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm text-[#00f0ff] group-hover:gap-3 transition-all">
                <span>{cards[0].cta}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Right top: Import from PDF */}
            <div
              className="group bg-[#0a0a12] border border-zinc-800 hover:border-[#ff00aa] p-8 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              onClick={cards[1].onClick}
            >
              <div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-all duration-300"
                  style={{
                    backgroundColor: `${cards[1].accent}15`,
                    color: cards[1].accent,
                  }}
                >
                  <FileUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#ff00aa] transition-colors">
                  {cards[1].title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  {cards[1].description}
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm text-[#ff00aa] group-hover:gap-3 transition-all">
                <span>{cards[1].cta}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Right bottom: Import from JSON */}
            <div
              className="group bg-[#0a0a12] border border-zinc-800 hover:border-[#b8ff00] p-8 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between"
              onClick={cards[2].onClick}
            >
              <div>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-all duration-300"
                  style={{
                    backgroundColor: `${cards[2].accent}15`,
                    color: cards[2].accent,
                  }}
                >
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#b8ff00] transition-colors">
                  {cards[2].title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  {cards[2].description}
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm text-[#b8ff00] group-hover:gap-3 transition-all">
                <span>{cards[2].cta}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Info Badges Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {infoBadges.map((badge, i) => (
              <div
                key={badge.label}
                className="flex items-center gap-4 bg-[#0a0a12]/60 border border-zinc-800/50 px-6 py-4"
                style={{
                  animation: "fade-in-up 0.6s ease-out forwards",
                  opacity: 0,
                  animationDelay: `${0.5 + i * 0.1}s`,
                }}
              >
                <badge.icon
                  className="w-5 h-5 shrink-0"
                  style={{ color: badge.accent }}
                />
                <div>
                  <div
                    className="text-[10px] font-mono uppercase tracking-wider mb-0.5"
                    style={{ color: badge.accent }}
                  >
                    {badge.label}
                  </div>
                  <div className="text-sm text-white">{badge.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
