import { NextResponse, type NextRequest } from "next/server";

import { MARKDOWN_BY_PATH } from "@/lib/markdown/agent-content";
import { estimateTokens, wantsMarkdown } from "@/lib/markdown/negotiate";

// Markdown for Agents (application-level content negotiation).
// Spec: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
//
// When a client sends `Accept: text/markdown`, we short-circuit the request
// and return a markdown representation of the page directly from the proxy,
// bypassing React rendering. HTML remains the default for browsers.
//
// Per the spec, the converted response MUST set:
//   - Content-Type: text/markdown; charset=utf-8
//   - Vary: Accept  (so caches keep HTML and Markdown variants separate)
//   - x-markdown-tokens  (estimated token count of the markdown body)
//
// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` and
// the `middleware` export to `proxy`. See:
// https://nextjs.org/docs/messages/middleware-to-proxy

export function proxy(request: NextRequest) {
  if (request.method !== "GET") {
    return NextResponse.next();
  }

  const accept = request.headers.get("accept");
  if (!wantsMarkdown(accept)) {
    return NextResponse.next();
  }

  // Normalize: strip trailing slash (except for root) and lowercase.
  const rawPath = request.nextUrl.pathname;
  const normalizedPath =
    rawPath.length > 1 && rawPath.endsWith("/")
      ? rawPath.replace(/\/+$/, "")
      : rawPath;

  const entry = MARKDOWN_BY_PATH[normalizedPath];
  if (!entry) {
    // No markdown representation for this route — fall through to HTML
    // rather than 404'ing, so agents still get *something* useful and
    // unknown paths keep working as before.
    return NextResponse.next();
  }

  const tokenCount = estimateTokens(entry.body);

  return new NextResponse(entry.body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // Per spec: caches must store separate variants for HTML and Markdown.
      "Vary": "Accept",
      // Estimated token count of the converted markdown body.
      "x-markdown-tokens": String(tokenCount),
      // Allow agents (and browsers in dev) to cache briefly; HTML and MD
      // variants are disambiguated by Vary above.
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const config = {
  // Run on everything except:
  //   - /api/*            -> JSON endpoints, never markdown
  //   - /_next/*          -> Next.js internals (chunks, static, image)
  //   - common static files in /public served at the root
  //   - llms.txt, robots.txt, sitemap.xml, favicon.ico
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|llms.txt|llms-full.txt|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$|.*\\.webp$|.*\\.pdf$).*)",
  ],
};
