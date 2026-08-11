import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CraftCV - ATS-Ready CV Generator",
    template: "%s | CraftCV",
  },
  description:
    "Create professional, ATS-optimized CVs in minutes. Free CV builder with AI-powered optimization and PDF export.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "CraftCV - ATS-Ready CV Generator",
    description:
      "Create professional, ATS-optimized CVs in minutes. Free CV builder with AI-powered optimization and PDF export. No login required, local-first privacy.",
    siteName: "CraftCV",
    locale: "en_US",
    // og:image comes from app/opengraph-image.tsx (generated at build time).
  },
  twitter: {
    // No title/description here on purpose: child segments would inherit these
    // verbatim and every page's Twitter card would read "CraftCV - ATS-Ready CV
    // Generator". Twitter falls back to og:title/og:description, which are
    // already per-page. twitter:image is reused from app/opengraph-image.tsx.
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD structured data: SoftwareApplication describes the app entity to
// search engines. Note: a SoftwareApplication rich result additionally
// requires aggregateRating/review; do not add fabricated ratings — add real
// data only when it exists.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CraftCV",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "Free, open-source ATS-optimized CV builder with AI-powered optimization, keyword gap analysis, and PDF export. CV data is stored locally in the browser by default; AI and ATS features send selected content to external providers for processing.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "ATS Score with 16 deterministic lint rules",
    "Keyword gap analysis against job descriptions",
    "AI-powered CV optimization with PII masking",
    "PDF import with AI content extraction",
    "Real-time PDF preview",
    "Local-first privacy — no data stored",
    "JSON export/import for data portability",
  ],
  creator: {
    "@type": "Person",
    name: "Andrea Falcon",
    url: "https://andreafalcon.dev",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GTM_ID = process.env.GTM_ID;

  return (
    <html lang="en">
      <head>
        {GTM_ID && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* JSON-LD structured data for rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* GTM noscript fallback */}
        {GTM_ID && (
          <noscript>
            <iframe
              title="Google Tag Manager"
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
