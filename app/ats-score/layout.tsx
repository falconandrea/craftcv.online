import type { Metadata } from "next";

import { pageOpenGraph } from "@/lib/site";

export const metadata: Metadata = {
  title: "ATS CV Check — 16 Rule-Based Checks",
  description: "Check your CV with 16 deterministic ATS lint rules. Add a job description for keyword gaps, plus a separate best-effort AI review. No account required.",
  alternates: { canonical: "/ats-score" },
  openGraph: pageOpenGraph("/ats-score"),
};

export default function AtsScoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
