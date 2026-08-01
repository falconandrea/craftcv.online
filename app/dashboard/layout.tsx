import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | CraftCV",
  description: "Initialize your workspace. Start a new CV from scratch, import a PDF with AI, or restore a backup.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
