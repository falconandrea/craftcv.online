# TODO — your action items from the SEO review

> These are the items the agent **cannot** resolve with code alone. They need a
> decision, an asset, or access you have. Grouped by priority.

## 🔴 Merge blockers (do before merging `fix/seo-improvements`)

- [ ] **Create `/public/og.png` (1200×630).** It's referenced in OG/Twitter tags
      but not committed → social shares return a 404 image (worse than no image).
      Either add the asset or remove the `images` blocks from `app/layout.tsx`.
- [ ] **Decide the GTM strategy.** Right now the root layout keeps
      `export const dynamic = "force-dynamic"` so GTM (read from the runtime env
      `GTM_ID`) actually renders. Removing `force-dynamic` (as the first version
      of this branch did) silently breaks analytics because the Dockerfile only
      passes `NEXT_PUBLIC_*` at build, not `GTM_ID`. Pick one:
      - **(A) Keep as-is** — analytics works, pages are server-rendered (fine
        behind Traefik; marginal perf cost). No action needed.
      - **(B) Migrate to static prerender** — rename to `NEXT_PUBLIC_GTM_ID`,
        inject it as a **build ARG** (`Dockerfile` + `.github/workflows/deploy.yml`
        + `server/docker-compose.yml` build args), then remove `force-dynamic`.
        This is the "better" long-term state but is a coordinated deploy change.
      Tell the agent which path; it can implement (B) end-to-end.

## 🟠 Evidence / setup (do before content work — see Phase 0)

- [ ] **Confirm GSC** ownership is verified and data is flowing (progress.md
      says done — sanity-check it). Submit `sitemap.xml`.
- [ ] **Collect a 2-4 week baseline** from GSC: indexed pages, impressions,
      clicks, position, top queries. Write the real numbers into SEO-STRATEGY.md.
- [ ] **Own your brand SERP**: search `CraftCV` incognito from your target
      market — you must rank #1. If not, fix the homepage copy + get a few brand
      mentions/backlinks first.
- [ ] **Real keyword research** (Ahrefs free / Keyword Planner / manual SERP):
      volume, difficulty, intent, SERP composition for each candidate. Replace
      the placeholder keywords in SEO-STRATEGY.md with evidenced ones.
- [ ] **Wire conversion events in GTM/GA4**: `cta_start_build`, `pdf_export`,
      `ats_score_run`, `ai_message_sent`. Traffic without conversion data is
      vanity.

## 🟡 Content & E-E-A-T decisions

- [ ] **Pick the canonical ATS URL.** Use `/ats-score` (exists) and do **not**
      create `/ats-checker` — avoids cannibalisation. Confirm so the plan can
      focus content on a single page.
- [ ] **Add a real author/About page** (Andrea bio + GitHub/profile links). Needed
      for E-E-A-T on a new domain. Say the word and the agent can scaffold it
      (+ `Person` schema).
- [ ] **Decide on `/cv-templates`.** Only build it if multiple real, comparable
      templates exist. Otherwise skip.

## 🟢 Optional / future polish

- [ ] **Sitemap tweaks**: consider dropping `/privacy` + `/cookies` (not
      strategic) and replacing `lastModified = new Date()` with real per-route
      dates.
- [ ] **CSP**: add a Content-Security-Policy (decide nonce vs hash vs
      `unsafe-inline` given GTM's inline script); afterwards `X-Frame-Options`
      can be dropped in favour of `frame-ancestors`.
- [ ] **Rich result readiness**: when you have *real* ratings/reviews, add
      `aggregateRating` to the `SoftwareApplication` JSON-LD. Never fabricate.
- [ ] **Distribution**: before HN/Reddit, start with GitHub README + a DEV.to
      technical post (cheap, lasting). HN "Show HN" / Reddit are higher-variance.
