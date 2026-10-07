import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Shield, Lock } from "lucide-react";
import { pageOpenGraph } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description: "Our commitment to your privacy and data security.",
  alternates: { canonical: "/privacy" },
  openGraph: pageOpenGraph("/privacy"),
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
            Last Updated: October 7, 2026 // Status: Active
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#00f0ff]/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Lock className="w-24 h-24 text-[#00f0ff]" />
            </div>
            <h2 className="text-xl font-mono font-bold text-[#00f0ff] mb-4 flex items-center gap-2">
              <span className="text-[#ff00aa]">&gt;</span> 01_LOCAL_CV_STORAGE
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                CraftCV uses a local-first editor: CV data is saved in your browser&apos;s localStorage, without application-level encryption. We do not maintain a central database of user CVs. Export JSON for a portable backup; clearing browser storage removes the saved local copy.
              </p>
              <p className="mt-4">
                Your saved CV stays in browser local storage. AI features and ATS analysis transmit content for processing; analytics and session recording are described below.
              </p>
            </div>
          </section>

          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#ff00aa]/30 transition-colors">
            <h2 className="text-xl font-mono font-bold text-[#ff00aa] mb-4 flex items-center gap-2">
              <span className="text-[#00f0ff]">&gt;</span> 02_AI_PROCESSING_PROTOCOL
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                When you choose features that require server or AI processing:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>CV content is sent through our server to the configured external AI provider for processing. Provider handling depends on its own policies.</li>
                <li>
                  <strong>AI Optimize:</strong> In the standard editor flow, structured name, email, phone and profile-link fields are masked in the browser before transmission. Identifiers in free-text CV fields or chat messages may still be sent.
                </li>
                <li>
                  <strong>PDF Import & ATS analysis:</strong> The PDF is uploaded to our server for text extraction. Import sends up to 15,000 characters of extracted text to the configured provider. ATS checks run on the full extracted text and filename; up to 15,000 characters may be sent for AI review when available. Neither flow masks that text, and neither sends the original PDF to the AI provider.
                </li>
                <li><strong>Job descriptions:</strong> When supplied for keyword analysis or ATS review, job-description text is sent to the configured provider without PII masking.</li>
                <li><strong>Generate TL;DR:</strong> The selected entry&apos;s title, role, description and CV language are sent to the provider without PII masking. This flow does not use AI Optimize&apos;s patch-grounding checks.</li>
                <li><strong>Storage and retention:</strong> The application does not save uploaded PDFs or AI request content to a central CV database. Aggregate usage and token counters are saved server-side. Connection identifiers and request timestamps are held in memory for rate limiting. Error logs can include provider errors or response excerpts; their retention depends on deployment logging. External AI and analytics services handle data under their own policies; we do not promise zero retention by those services.</li>
              </ul>
            </div>
          </section>

          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#b8ff00]/30 transition-colors">
            <h2 className="text-xl font-mono font-bold text-[#b8ff00] mb-4 flex items-center gap-2">
              <span className="text-[#ff00aa]">&gt;</span> 03_ANALYTICS_&_SUBPROCESSORS
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                GTM is loaded when a GTM_ID is configured. The deployment uses the following services for measurement and consent; tags, cookie lifetimes and consent behavior are configured outside this repository in GTM and the service settings:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2">
                <li>Google Analytics 4 (GA4) / GTM: Traffic and feature-usage analytics.</li>
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
