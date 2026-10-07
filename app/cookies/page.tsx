import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Terminal, Database, Shield, Zap } from "lucide-react";
import { pageOpenGraph } from "@/lib/site";

export const metadata = {
  title: "Cookie Policy",
  description: "Understanding tracking modules and browser storage.",
  alternates: { canonical: "/cookies" },
  openGraph: pageOpenGraph("/cookies"),
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col selection:bg-[#00f0ff] selection:text-black">
      {/* Background Grid */}
      <div className="fixed inset-0 retro-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 0, 170, 0.05) 0%, transparent 60%)'
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00f0ff] bg-[#00f0ff]/10 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Database className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-[10px] font-mono font-bold text-[#00f0ff] uppercase tracking-widest">
              Storage Module v2.0
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tighter mb-4 text-glow italic">
            COOKIE_POLICY<span className="text-[#ff00aa]">.SYS</span>
          </h1>
          <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">
            Last Updated: October 7, 2026 // Status: Active
          </p>
        </div>

        <div className="space-y-8">
          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#b8ff00]/30 transition-colors">
            <h2 className="text-xl font-mono font-bold text-[#b8ff00] mb-4 flex items-center gap-2">
              <span className="text-[#00f0ff]">&gt;</span> CORE_OPERATIONS
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                The editor saves your CV in browser localStorage, not in an account session cookie. A separate localStorage value remembers dismissal of the AI Optimize privacy notice. Consent services may use cookies or storage to remember your choices; this is distinct from CV storage.
              </p>
              <div className="mt-6 border border-[#b8ff00]/20 p-4 rounded bg-[#b8ff00]/5 text-xs">
                <div className="font-bold text-[#b8ff00] mb-2">LOCAL_STORAGE_MANIFEST:</div>
                <div className="space-y-1">
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span>cv-storage</span>
                    <span className="text-zinc-500 italic">User CV state data.</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span>ai_privacy_dismissed</span>
                    <span className="text-zinc-500 italic">Privacy notice dismissal.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#0a0a12]/80 border border-zinc-800/50 p-8 rounded-lg relative overflow-hidden group hover:border-[#00f0ff]/30 transition-colors">
            <h2 className="text-xl font-mono font-bold text-[#00f0ff] mb-4 flex items-center gap-2">
              <span className="text-[#ff00aa]">&gt;</span> ANALYTICS_BEACONS
            </h2>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-400 leading-relaxed">
              <p>
                Analytics measure site usage and interactions. They are separate from local CV storage and may use identifiers; we do not describe all collected data as anonymous. GTM loads when configured; analytics tags and consent controls are managed in the deployed GTM container and service settings.
              </p>
              <div className="mt-4 space-y-4">
                <div className="flex gap-4 p-4 border border-[#00f0ff]/10 rounded bg-[#00f0ff]/3">
                  <Zap className="w-10 h-10 text-[#00f0ff] shrink-0" />
                  <div>
                    <div className="text-white font-bold text-sm">Google Tag Manager</div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Manages the deployment of various measurement scripts.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 border border-[#00f0ff]/10 rounded bg-[#00f0ff]/3">
                  <Shield className="w-10 h-10 text-[#00f0ff] shrink-0" />
                  <div>
                    <div className="text-white font-bold text-sm">Google Analytics 4 (GA4)</div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Traffic and aggregate feature-usage measurement.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 border border-[#00f0ff]/10 rounded bg-[#00f0ff]/3">
                  <Terminal className="w-10 h-10 text-[#00f0ff] shrink-0" />
                  <div>
                    <div className="text-white font-bold text-sm">Microsoft Clarity</div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Interaction analytics and session recording to help understand clicks, scrolling and usability issues.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-l-2 border-[#ff00aa]/30 pl-6 py-4">
            <h2 className="text-lg font-mono font-bold text-zinc-300 mb-2 italic">
              OVERRIDE_PREFERENCES
            </h2>
            <p className="text-zinc-500 font-mono text-sm leading-relaxed">
              Where the deployed CookieYes consent controls are available, use them to review or change analytics consent. Cookie names, lifetimes and which tags are consent-controlled depend on the deployed service configuration.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
