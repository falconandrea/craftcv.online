"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Lock, Sparkles, ArrowRight, Terminal, Cpu, Database, Eye } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#050508] text-white overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 retro-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 240, 255, 0.08) 0%, transparent 60%)'
      }} />
      
      {/* Header */}
      <AppHeader showStartBuilding={true} />

      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-40 px-4 relative">
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-32 h-32 border border-[#ff00aa]/20 rotate-45 opacity-50" style={{ animation: 'float 6s ease-in-out infinite' }} />
          <div className="absolute bottom-20 right-10 w-24 h-24 border border-[#00f0ff]/20 -rotate-12 opacity-30" style={{ animation: 'float 8s ease-in-out infinite 1s' }} />
          
          <div className="container mx-auto max-w-5xl relative">
            {/* Retro badge */}
            <div 
              className="inline-flex items-center gap-2 border border-[#00f0ff]/40 bg-[#00f0ff]/5 text-[#00f0ff] px-4 py-2 text-sm font-mono mb-10"
              style={{ animation: 'fade-in-up 0.6s ease-out forwards', opacity: 0 }}
            >
              <Sparkles className="w-4 h-4" />
              <span>{/* // */} CV BUILDER — AI OPTIMIZE + ATS CHECKS</span>
            </div>

            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
              style={{ animation: 'fade-in-up 0.6s ease-out 0.1s forwards', opacity: 0 }}
            >
              <span className="text-zinc-100">A stronger CV.</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#ff00aa]" style={{ textShadow: '0 0 60px rgba(0,240,255,0.5)' }}>
                Grounded in your
              </span>
              <br />
              <span className="text-zinc-400 text-4xl md:text-6xl">experience.</span>
            </h1>
            
            <p 
              className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl font-mono text-sm leading-relaxed"
              style={{ animation: 'fade-in-up 0.6s ease-out 0.2s forwards', opacity: 0 }}
            >
              Build and tailor your CV with AI Optimize, which checks proposed changes against your existing career details. Rule-based ATS checks and job keyword analysis help you spot concrete gaps.
            </p>
            
            <div 
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
              style={{ animation: 'fade-in-up 0.6s ease-out 0.3s forwards', opacity: 0 }}
            >
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg bg-[#00f0ff] text-black hover:bg-[#00f0ff]/80 font-bold border border-[#00f0ff] retro-border-glow group">
                  <span className="mr-2">▶</span>
                  Build my CV
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a
                href="https://github.com/falconandrea/craftcv.online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-[#00f0ff] transition-colors font-mono text-sm flex items-center gap-2"
              >
                <span className="text-[#ff00aa]">&gt;</span> View source on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="py-12 px-4 border-y border-[#00f0ff]/10 bg-[#00f0ff]/3">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Deterministic checks', value: '16 Rules', icon: FileText },
                { label: 'Browser storage', value: 'Local', icon: Lock },
                { label: 'Review AI suggestions', value: 'You decide', icon: Cpu },
                { label: 'No Signup', value: 'Free', icon: Database },
              ].map((stat, i) => (
                <div 
                  key={stat.label} 
                  className="text-center group"
                  style={{ animation: 'fade-in-up 0.6s ease-out forwards', opacity: 0, animationDelay: `${0.4 + i * 0.1}s` }}
                >
                  <stat.icon className="w-6 h-6 mx-auto mb-2 text-[#00f0ff] opacity-70 group-hover:opacity-100 transition-opacity" />
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Optimize Section */}
        <section id="ai" className="py-24 px-4 relative">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[#ff00aa] font-mono text-sm mb-6">
                  <Cpu className="w-4 h-4" />
                  <span>{/* // */} AI_OPTIMIZE</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Improve your wording.{" "}
                  <span className="block text-[#00f0ff]">Keep your facts in view.</span>
                </h2>
                <p className="text-zinc-400 mb-8 text-lg">
                  In the AI Optimize flow, proposed edits are compared with your existing CV. Protected dates are preserved, unsupported additions are flagged, and detected new metrics are flagged for verification. You review the proposed changes and decide whether to apply them.
                </p>
                <div className="space-y-4">
                  {[
                    'Protected experience dates and education/certification years',
                    'Unsupported skills and entities flagged for review',
                    'New metrics flagged; confirmation in the diff review',
              ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3 font-mono text-sm">
                      <span className="text-[#b8ff00]">✓</span>
                      <span className="text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Code-like visualization */}
              <div className="bg-[#0a0a12] border border-[#00f0ff]/20 p-6 font-mono text-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-8 bg-[#00f0ff]/5 border-b border-[#00f0ff]/20 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-zinc-500 text-xs">AI Optimize · review example</span>
                </div>
                <div className="pt-8 space-y-6">
                  <p className="text-zinc-400 text-xs">Illustrative AI Optimize checks, not a live analysis.</p>
                  <div>
                    <p className="text-zinc-200">Suggested skill: Kubernetes</p>
                    <p className="text-amber-300 mt-2">Not found in your existing CV. Add only if you can support it.</p>
                  </div>
                  <div>
                    <p className="text-zinc-200">Suggested result: +40% performance</p>
                    <p className="text-amber-300 mt-2">New metric detected. Verify before applying.</p>
                  </div>
                  <div>
                    <p className="text-zinc-200">Experience start date: 2020 → 2019</p>
                    <p className="text-[#b8ff00] mt-2">Change rejected. Original date preserved: 2020.</p>
                  </div>
                  <p className="text-zinc-400 text-xs">These checks help surface inconsistencies; they do not verify your career history or catch every unsupported claim.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-4 bg-[#00f0ff]/3 border-y border-[#00f0ff]/10">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 text-[#00f0ff] font-mono text-sm mb-4">
                <Terminal className="w-4 h-4" />
                <span>{/* // */} MODULE_MANIFEST</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">See what needs attention.</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Get concrete checks on your CV and compare it with a job description. The rule-based lint score stays separate from the AI evaluation.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: FileText,
                  title: '16 deterministic ATS checks',
                  description: 'Checks run on the text extracted from your PDF and its filename: contact details, bullet quality, section structure and common parsing issues. The weighted lint score is calculated by code, not an AI model.',
                  color: '#00f0ff'
                },
                {
                  icon: Cpu,
                  title: 'Job keyword gap',
                  description: 'AI extracts keywords from the job description, then code checks for those terms in your CV. See present and missing keywords as prompts for review, not proof that you have or lack a skill.',
                  color: '#ff00aa'
                },
                {
                  icon: Eye,
                  title: 'Separate AI evaluation',
                  description: 'AI also provides feedback on formatting, impact and completeness. Its evaluation stays separate from the deterministic lint score. These reports are guidance, not a guarantee of ATS acceptance or an interview.',
                  color: '#b8ff00'
                },
              ].map((feature) => (
                <div 
                  key={feature.title}
                  className="group bg-[#0a0a12] border border-zinc-800 hover:border-[var(--color)] p-8 transition-all duration-300 hover:-translate-y-1"
                  style={{ '--color': feature.color } as React.CSSProperties}
                >
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-6 transition-all duration-300"
                    style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
                  >
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[var(--color)] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="py-24 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="inline-flex items-center gap-2 text-[#ff00aa] font-mono text-sm mb-6">
              <Lock className="w-4 h-4" />
              <span>LOCAL STORAGE + YOUR CONTROL</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Saved in your browser. Shared for AI when you choose.</h2>
            <div className="space-y-4 text-zinc-400 text-lg max-w-3xl leading-relaxed">
              <p>Your editor data is saved in your browser. Export it as JSON to keep a copy, and download your CV as a PDF. No account required.</p>
              <p>When you use AI features or the ATS analyzer, content is sent through our server to an external AI provider. AI Optimize masks the structured name, email, phone and profile-link fields; identifiers in free text or chat may still be sent. PDF import and ATS analysis send extracted text without that masking.</p>
              <p>We use Google Analytics via GTM and Microsoft Clarity for analytics and session recording, with CookieYes for consent management.</p>
              <Link href="/privacy" className="inline-block text-[#00f0ff] underline underline-offset-4">Read the privacy policy</Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 text-center relative">
          <div className="container mx-auto max-w-3xl relative">
            {/* Decorative glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#00f0ff]/10 to-transparent opacity-50" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 text-[#b8ff00] font-mono text-sm mb-6">
                <Eye className="w-4 h-4" />
                <span>{/* // */} READY_TO_DEPLOY</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Open source. <span className="text-[#00f0ff]">Open to inspection.</span>
              </h2>
              <p className="text-zinc-400 mb-10 text-lg">
                Explore the ATS rules and AI Optimize safeguards in the source, or start building your CV for free. No account needed.
              </p>
              <div className="flex flex-wrap justify-center gap-6 mb-8 font-mono text-sm">
                <a href="https://github.com/falconandrea/craftcv.online" className="text-[#00f0ff] underline underline-offset-4">Source on GitHub</a>
                <a href="https://github.com/falconandrea/craftcv.online/blob/main/docs/ATS_RULES.md" className="text-[#00f0ff] underline underline-offset-4">ATS rules and scoring</a>
                <Link href="/ats-score" className="text-[#00f0ff] underline underline-offset-4">Check my CV</Link>
              </div>
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-10 text-lg bg-[#00f0ff] text-black hover:bg-[#00f0ff]/80 font-bold border border-[#00f0ff] retro-border-glow group">
                  <Terminal className="mr-2 w-5 h-5" />
                  Build my CV
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}