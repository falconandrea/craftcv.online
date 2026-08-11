import type { Metadata } from "next";

import { pageOpenGraph } from "@/lib/site";

export const metadata: Metadata = {
  title: "ATS Score Simulator",
  description: "Test your resume against applicant tracking systems. Get actionable feedback and improve your keyword matching for better success.",
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
