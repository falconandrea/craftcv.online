import { AtsScoreContent } from "@/components/ats/AtsScoreContent";
import { AtsScoreTool } from "@/components/ats/AtsScoreTool";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Editor", href: "/editor" },
  { label: "ATS Score", href: "/ats-score" },
];

export default function AtsScorePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-[#ff00aa] selection:text-white flex flex-col">
      <AppHeader navLinks={NAV_LINKS} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-block px-3 py-1 mb-4 rounded-full border border-[#ff00aa] bg-[#ff00aa]/10">
            <span className="text-xs font-mono font-semibold tracking-widest text-[#ff00aa] uppercase">
              RULE-BASED CHECKS + AI REVIEW
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono tracking-tighter mb-4 text-glow">
            Check how ATS-friendly <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ffd5] to-[#b8ff00]">your CV is</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Run 16 deterministic checks on structure, contact details, bullet quality and parsability. Add a job description to identify keyword gaps, with a separate AI review for additional feedback. No account required.
          </p>
        </div>

        <AtsScoreTool />
        <AtsScoreContent />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
