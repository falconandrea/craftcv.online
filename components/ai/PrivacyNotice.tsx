"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const STORAGE_KEY = "ai_privacy_dismissed";

export function PrivacyNotice() {
    const [visible, setVisible] = useState(() => {
        // Read localStorage once during initial render (client-side only)
        if (typeof window !== "undefined") {
            return !localStorage.getItem(STORAGE_KEY);
        }
        return false;
    });

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="flex items-start gap-3 rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-4 py-3 text-xs font-mono text-[#00f0ff]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-zinc-400">
                <span className="text-[#00f0ff] font-semibold">PRIVACY_SHIELD:</span> Your name, email, and links are
                automatically masked before being sent to the AI.
            </p>
            <button
                onClick={handleDismiss}
                className="shrink-0 rounded p-0.5 hover:bg-[#00f0ff]/10 transition-colors text-zinc-500 hover:text-[#00f0ff]"
                aria-label="Dismiss privacy notice"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
