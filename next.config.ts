import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse"],
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            // RFC 8288 Link header for agent discovery (RFC 9727).
            // Points agents to the machine-readable site description.
            key: "Link",
            value: [
              '</llms.txt>; rel="describedby"; type="text/plain"',
              '</robots.txt>; rel="describedby"; type="text/plain"',
            ].join(", "),
          },
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
