# ADR 0001 — Decouple from Cloudflare/OpenAI hosting; add a NestJS API

- **Status:** Accepted
- **Date:** 2026-09-04

## Context

The app began as a Codex-generated site. Three couplings came with it:

1. `@openai/sites-vite-plugin` and `.openai/hosting.json` bound the build to OpenAI's
   sites hosting. The deployed site answered **HTTP 401** to anonymous visitors — it was
   only reachable by someone logged into the owning account.
2. `vinext` + `@cloudflare/vite-plugin` + `wrangler` made Cloudflare Workers the runtime.
   vinext reimplements the Next.js API surface on Vite, but its deploy path is
   hard-coded to Workers ([cloudflare/vinext#80](https://github.com/cloudflare/vinext/issues/80)
   is open), and the project describes itself as not yet a drop-in replacement for every
   application. Persistence would have meant D1 and R2 — both Cloudflare-only.
3. `next/font/google` fetched Geist from Google Fonts at build time, so a build needed
   network egress to `fonts.googleapis.com`.

Meanwhile the product vision describes a system well beyond a static catalogue:
ingestion from RSS, transcription and translation, learnability profiling, a completion
signal segmented by level, saved words with audio context. That is a backend.

## Decision

1. Replace vinext with **official Next.js 16** for the web app. The source already used
   Next.js APIs (`app/`, `next/font`, `next/navigation`, the Metadata API,
   `generateStaticParams`), so this is a configuration change, not a rewrite.
2. Drop the OpenAI sites plugin and hosting config entirely.
3. Self-host Geist via the `geist` package so builds need no network egress.
4. Add **@discopod/api**, a NestJS 11 service, as the home for domain logic. npm
   workspaces monorepo: `apps/web`, `apps/api`.
5. Keep storage behind a port (`CatalogRepository`) with an in-memory adapter, so the
   datastore choice stays open and vendor-neutral.

## Consequences

**Gained.** The site can be hosted anywhere, publicly, with no login. Every route still
prerenders, so a full static export is available as the fastest public demo. Domain
logic has somewhere to live that is not a route handler. No vendor SDK appears in the
source.

**Lost.** Cloudflare's edge runtime and its bindings (D1, R2, KV) are no longer
available without reintroducing the coupling. If edge latency becomes a requirement,
this decision is the thing to revisit.

**Cost.** The web app currently reads the catalogue from its own `lib/podcasts.ts`
rather than the API. That duplication is temporary and tracked in
[ARCHITECTURE.md](../ARCHITECTURE.md#migration-state); it must be closed before the
catalogue changes shape.

## Verification

In a clean container: `next build` in both Node and static-export modes, `nest build`,
and the API exercised over HTTP (health, shows, ranked episodes, start-here, transcript,
saving a word, plus 400 and 404 paths). The Dockerfiles are not yet verified.
