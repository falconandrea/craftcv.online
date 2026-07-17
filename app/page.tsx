"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Lock, Zap, Sparkles, ArrowRight, Terminal, Cpu, Database, Eye } from "lucide-react";
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
              <span>{/* // */} ATS ENGINE v2 — DETERMINISTIC RULES + KEYWORD GAP</span>
            </div>

            <h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
              style={{ animation: 'fade-in-up 0.6s ease-out 0.1s forwards', opacity: 0 }}
            >
              <span className="text-zinc-100">Build your</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#ff00aa]" style={{ textShadow: '0 0 60px rgba(0,240,255,0.5)' }}>
                professional CV
              </span>
              <br />
              <span className="text-zinc-400 text-4xl md:text-6xl">in minutes</span>
            </h1>
            
            <p 
              className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl font-mono text-sm leading-relaxed"
              style={{ animation: 'fade-in-up 0.6s ease-out 0.2s forwards', opacity: 0 }}
            >
              <span className="text-[#00f0ff]">$</span> no login required
              <br />
              <span className="text-[#ff00aa]">$</span> local-first privacy
              <br />
              <span className="text-[#b8ff00]">$</span> ATS-optimized output
            </p>
            
            <div 
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
              style={{ animation: 'fade-in-up 0.6s ease-out 0.3s forwards', opacity: 0 }}
            >
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg bg-[#00f0ff] text-black hover:bg-[#00f0ff]/80 font-bold border border-[#00f0ff] retro-border-glow group">
                  <span className="mr-2">▶</span>
                  Initialize CV Builder
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a
                href="https://github.com/falconandrea/craftcv.online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-[#00f0ff] transition-colors font-mono text-sm flex items-center gap-2"
              >
                <span className="text-[#ff00aa]">&gt;</span> view_source()
              </a>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="py-12 px-4 border-y border-[#00f0ff]/10 bg-[#00f0ff]/3">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'ATS Lint + Gap', value: '16 Rules', icon: FileText },
                { label: 'Zero Data Stored', value: 'Local', icon: Lock },
                { label: 'AI Extraction', value: 'PDF', icon: Cpu },
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
                  <span>{/* // */} AI_MODULE_ACTIVE</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Tailor your CV to
                  <span className="block text-[#00f0ff]">any job — instantly</span>
                </h2>
                <p className="text-zinc-400 mb-8 text-lg">
                  Paste a job description and let the AI coach suggest targeted improvements: better keywords, stronger bullet points, relevant skills. You review every change.
                </p>
                <div className="space-y-4">
                  {[
                    'Chat-based suggestions with context',
                    'Privacy by design — PII masked before AI',
                    'One-click apply or skip each change',
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
                  <span className="ml-2 text-zinc-500 text-xs">ai_optimizer.ts</span>
                </div>
                <div className="pt-8 space-y-2">
                  <div className="text-zinc-500">{/* // */} Analyzing job description...</div>
                  <div><span className="text-[#ff00aa]">const</span> keywords <span className="text-[#00f0ff]">=</span> [</div>
                  <div className="pl-4 text-[#b8ff00]">&quot;React&quot;, &quot;TypeScript&quot;, &quot;System Design&quot;</div>
                  <div>];</div>
                  <div className="text-zinc-500 mt-4">{/* // */} Generating suggestions...</div>
                  <div><span className="text-[#ff00aa]">const</span> improvements <span className="text-[#00f0ff]">=</span> [</div>
                  <div className="pl-4 text-[#00f0ff]">&quot;Add &apos;Led team of 5 engineers&apos;&quot;,</div>
                  <div className="pl-4 text-[#00f0ff]">&quot;Include AWS cert (requested)&quot;,</div>
                  <div className="pl-4 text-[#00f0ff]">&quot;Quantify impact (+40% efficiency)&quot;</div>
                  <div>];</div>
                  <div className="mt-4 text-[#b8ff00]">{/* // */} Ready for review</div>
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
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Craft CV?</h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                Built for professionals who value privacy and results. No tracking, no storage, just clean CV generation.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: FileText,
                  title: 'ATS Score + Keyword Gap',
                  description: 'Upload your CV to test how ATS software parses it (16 deterministic lint rules), then paste a job description to see which keywords you are missing.',
                  color: '#00f0ff'
                },
                {
                  icon: Lock,
                  title: 'Privacy First',
                  description: 'Everything lives in your browser. No data stored. Export as JSON and keep full control.',
                  color: '#ff00aa'
                },
                {
                  icon: Zap,
                  title: 'PDF Import',
                  description: 'Upload an existing PDF and our AI extracts content to pre-fill the editor in seconds.',
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
                Ready to build your <span className="text-[#00f0ff]">CV?</span>
              </h2>
              <p className="text-zinc-400 mb-10 text-lg">
                Start for free. No account needed. AI-powered.
              </p>
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-10 text-lg bg-[#00f0ff] text-black hover:bg-[#00f0ff]/80 font-bold border border-[#00f0ff] retro-border-glow group">
                  <Terminal className="mr-2 w-5 h-5" />
                  Launch Editor
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