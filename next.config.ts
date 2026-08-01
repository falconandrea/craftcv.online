import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse"],
  async headers() {
    const securityHeaders = [
      {
        // HSTS — safe behind Traefik's TLS termination.
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    return [
      {
        // Security headers + agent discovery Link header on every route.
        source: "/:path*",
        headers: [
          ...securityHeaders,
          {
            // RFC 8288 Link header for agent discovery (RFC 9727).
            key: "Link",
            value: [
              '</llms.txt>; rel="describedby"; type="text/plain"',
              '</robots.txt>; rel="describedby"; type="text/plain"',
            ].join(", "),
          },
        ],
      },
      // Long-cache for Next.js hashed assets (_next/static/*).
      // Filenames are content-hashed, safe to cache aggressively.
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          ...securityHeaders,
        ],
      },
      // NOTE: `Vary: Accept` is intentionally NOT added here for HTML responses.
      // Next.js overwrites the Vary header on App Router pages (it manages
      // `rsc`, `next-router-state-tree`, etc. internally), so a Vary rule set
      // here would be silently dropped. The header IS set correctly on every
      // markdown response by the proxy (see proxy.ts), which is what matters
      // for cache correctness on the agent side. The current deployment
      // (Traefik on a VPS) has no variant-caching CDN in front, so HTML
      // responses do not need an explicit `Vary: Accept`.
    ];
  },
};

export default nextConfig;
