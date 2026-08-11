import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CV Editor",
  description: "Create and optimize your professional CV with our AI-powered editor. Real-time preview and ATS-friendly templates.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
