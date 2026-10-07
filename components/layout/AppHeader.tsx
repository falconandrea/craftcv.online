"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Terminal, Menu, X } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
  disabled?: boolean;
  badge?: string;
}

interface AppHeaderProps {
  showStartBuilding?: boolean;
  navLinks?: NavLink[];
}

export function AppHeader({ showStartBuilding = false, navLinks }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-50 border-b border-[#00f0ff]/20 px-6 py-4 bg-[#050508]/90 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Terminal className="w-6 h-6 text-[#00f0ff]" />
          <span className="text-xl font-bold tracking-tight">
            CRAFT<span className="text-[#00f0ff]">_CV</span>
          </span>
        </Link>

        {/* Navigation Links */}
        {navLinks && navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              if (link.disabled) {
                return (
                  <span
                    key={link.label}
                    className="text-sm text-zinc-400 opacity-50 cursor-not-allowed pointer-events-none flex items-center gap-1.5"
                  >
                    {link.label}
                    {link.badge && (
                      <span className="text-[10px] bg-[#00f0ff]/20 text-[#00f0ff] px-1.5 py-0.5 font-mono uppercase rounded">
                        {link.badge}
                      </span>
                    )}
                  </span>
                );
              }

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-sm transition-colors ${
                    isActive
                      ? "text-[#00f0ff]"
                      : "text-zinc-400 hover:text-[#00f0ff]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* CTA Button */}
        <div className="hidden md:block">
          {showStartBuilding ? (
            <Link href="/dashboard">
              <Button className="bg-[#00f0ff] text-black hover:bg-[#00f0ff]/80 font-semibold">
                Build my CV
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Mobile Menu Toggle */}
        {navLinks && navLinks.length > 0 && (
          <button 
            className="md:hidden p-2 -mr-2 text-zinc-400 hover:text-[#00f0ff]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && navLinks && navLinks.length > 0 && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#050508] border-b border-[#00f0ff]/20 px-6 py-4 flex flex-col gap-4 shadow-xl shadow-black/50">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            if (link.disabled) {
              return (
                <span
                  key={link.label}
                  className="text-sm text-zinc-400 opacity-50 flex items-center gap-2 py-2 border-b border-white/5 last:border-0"
                >
                  {link.label}
                  {link.badge && (
                    <span className="text-[10px] bg-[#00f0ff]/20 text-[#00f0ff] px-1.5 py-0.5 font-mono uppercase rounded">
                      {link.badge}
                    </span>
                  )}
                </span>
              );
            }

            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm py-2 border-b border-white/5 last:border-0 transition-colors ${
                  isActive ? "text-[#00f0ff] font-bold" : "text-zinc-400"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
