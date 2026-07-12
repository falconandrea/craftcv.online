import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Shield, Lock } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | CraftCV",
  description: "Our commitment to your privacy and data security.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col selection:bg-[#ff00aa] selection:text-white">
      {/* Background Grid */}
      <div className="fixed inset-0 retro-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.05) 0%, transparent 60%)'
      }} />

      <AppHeader
        navLinks={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Editor", href: "/editor" },
          { label: "ATS Score", href: "/ats-score" },
        ]}
      />

      <main className="relative z-10 flex-1 container mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#b8ff00] bg-[#b8ff00]/10 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Shield className="w-4 h-4 text-[#b8ff00]" />
            <span className="text-[10px] font-mono font-bold text-[#b8ff00] uppercase tracking-widest">
              Security Protocol v2.0
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tighter mb-4 text-glow italic">
            PRIVACY_POLICY<span className="text-[#00f0ff]">.EXE</span>
          </h1>
          <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">
            Last Updated: April 2026 // Status: Active
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#00f0ff]/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Lock className="w-24 h-24 text-[#00f0ff]" />
            </div>
            <h2 className="text-xl font-mono font-bold text-[#00f0ff] mb-4 flex items-center gap-2">
              <span className="text-[#ff00aa]">&gt;</span> 01_LOCAL_STORAGE_ENCRYPTION
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                CraftCV is designed with a &quot;Privacy-First&quot; architecture. By default, all CV data you enter is stored exclusively in your browser&apos;s local storage. We do not maintain a central database of user CVs.
              </p>
              <p className="mt-4">
                Your data never leaves your device unless you explicitly use our AI-powered features or export your data.
              </p>
            </div>
          </section>

          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#ff00aa]/30 transition-colors">
            <h2 className="text-xl font-mono font-bold text-[#ff00aa] mb-4 flex items-center gap-2">
              <span className="text-[#00f0ff]">&gt;</span> 02_AI_PROCESSING_PROTOCOL
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                When using AI features (Optimization, PDF Import, ATS Score):
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>CV content is temporarily transmitted to our AI providers (Nous Research at the moment) for processing.</li>
                <li>
                  <strong>Optimization & Import:</strong> We attempt to mask Personally Identifiable Information (PII) like phone numbers and specific addresses before transmission.
                </li>
                <li>
                  <strong>ATS Score Simulator:</strong> The original PDF document is transmitted <u>without</u> modifications or PII masking. This is a technical requirement to accurately simulate how an enterprise ATS (Applicant Tracking System) parses your actual file structure, layout, and metadata.
                </li>
                <li>Data is processed in real-time and is not stored permanently by our platform after the request is completed.</li>
              </ul>
            </div>
          </section>

          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#b8ff00]/30 transition-colors">
            <h2 className="text-xl font-mono font-bold text-[#b8ff00] mb-4 flex items-center gap-2">
              <span className="text-[#ff00aa]">&gt;</span> 03_ANALYTICS_&_SUBPROCESSORS
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                We use the following services to monitor system health and improve user experience:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Google Analytics 4 (GA4) / GTM: Behavioral tracking (anonymous).</li>
                <li>Microsoft Clarity: Visual session recording for debugging UI issues.</li>
                <li>CookieYes: Consent management.</li>
              </ul>
            </div>
          </section>

          <section className="border-l-2 border-[#00f0ff]/30 pl-6 py-4">
            <h2 className="text-lg font-mono font-bold text-zinc-300 mb-2 italic">
              CONTACT_COORDINATES
            </h2>
            <p className="text-zinc-500 font-mono text-sm leading-relaxed">
              For security concerns or data inquiries:
              <br />
              <span className="text-[#00f0ff]">falcon.andrea88@gmail.com</span>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
