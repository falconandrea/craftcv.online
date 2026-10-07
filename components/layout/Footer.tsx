import Link from "next/link";
import { Github, Terminal } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#00f0ff]/20 bg-[#050508]/90 backdrop-blur-md py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <Terminal className="w-5 h-5 text-[#00f0ff] group-hover:scale-110 transition-transform" />
              <span className="text-lg font-bold tracking-tight font-mono">
                CRAFT<span className="text-[#00f0ff]">_CV</span>
              </span>
            </Link>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              &copy; {new Date().getFullYear()} CraftCV
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
            <Link href="/ats-score" className="text-xs font-mono text-zinc-400 hover:text-[#00f0ff] transition-colors uppercase tracking-wider">ATS Score</Link>
            <Link
              href="/privacy"
              className="text-xs font-mono text-zinc-400 hover:text-[#00f0ff] transition-colors uppercase tracking-wider"
            >
              PRIVACY_POLICY
            </Link>
            <Link
              href="/cookies"
              className="text-xs font-mono text-zinc-400 hover:text-[#00f0ff] transition-colors uppercase tracking-wider"
            >
              COOKIE_POLICY
            </Link>
            <a
              href="https://github.com/falconandrea/craftcv.online"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-zinc-400 hover:text-[#ff00aa] transition-colors"
            >
              <Github className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(255,0,170,0.5)]" />
              <span className="text-xs font-mono uppercase tracking-wider hidden sm:inline">SOURCE_CODE</span>
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
            built_with_nextjs_and_ai // open_source_software
          </p>
        </div>
      </div>
    </footer>
  );
}
