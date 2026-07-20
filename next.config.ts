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
    ];
  },
};

export default nextConfig;
