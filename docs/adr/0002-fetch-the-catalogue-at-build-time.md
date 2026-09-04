# ADR 0002 — The web app fetches its catalogue from the API at build time

- **Status:** Accepted
- **Date:** 2026-09-04
- **Supersedes:** the data duplication left open by [ADR 0001](0001-decouple-from-cloudflare-and-add-nestjs-api.md)

## Context

ADR 0001 added `apps/api` but left the web app reading its own copy of the catalogue
from `apps/web/lib/podcasts.ts`. The API's seed was derived from that file, so the same
seven episodes existed twice, in two shapes, and only one of them was reachable by any
other client. Worse, the numbers diverged in kind: `podcasts.ts` carried a hand-written
`match: 96` per card, while the API *computes* suitability from the difficulty profile
and the learner's level. The UI was showing an authored number and calling it a ranking.

The vision's one hard rule is that nothing is ranked without saying why. A hardcoded
percentage cannot satisfy that rule, because there is nothing behind it to explain.

So the web app had to read from the API. The question was *when*.

**Runtime fetch** — the browser (or a Next server) calls `discopod-api` on each visit.
This is the obvious shape, and it is wrong for this deployment:

- `discopod-web` is a **static export** on Render's CDN. A runtime fetch would move
  rendering into the browser, so the ranked list would arrive after paint — the one
  screen the product is about would be the slowest thing on the page.
- `discopod-api` is on Render's **free plan and sleeps after 15 idle minutes**. The first
  visitor after a quiet period would wait out a ~50s cold start looking at a spinner.
- It would put a network dependency between two services that, today, have nothing
  dynamic to say to each other. The catalogue changes when the seed changes — that is, on
  a commit.

**Build-time fetch** — the catalogue is baked into the HTML during `next build`. The
deployed site then has no runtime dependency on the API at all.

That raises its own problem: a build needs an API to fetch from. Fetching from the
*deployed* `discopod-api` fails three ways. The first Blueprint deploy builds both
services at once, so there is nothing to fetch from yet. CI would need network egress to
Render to build. And the free API sleeps, so a build could stall on a cold start — the
same defect, moved from the visitor to the pipeline.

## Decision

**The web build starts its own API, fetches from it over HTTP, and stops it again.**

`apps/web/scripts/build.mjs` is the web workspace's `build` script. It:

1. allocates a free ephemeral port,
2. spawns `apps/api/dist/main.js` on it,
3. polls `/api/health` until it answers (60s ceiling; aborts early if the child exits),
4. runs `next build` with `CATALOG_API_URL` pointing at it,
5. stops the API in a `finally`, and on `exit`/`SIGINT`/`SIGTERM`.

Setting `CATALOG_API_URL` yourself skips all of that and builds against an API you
already have running — a dev server, or the deployed one.

Consequences of this shape:

- **The build is offline-capable.** No egress, so CI and Render behave the same as a
  laptop with the wifi off.
- **The HTTP contract is genuinely exercised**, not stubbed: the build goes through the
  real controller, `ValidationPipe`, and ranking service. A breaking API change fails the
  web build.
- **The API is the single source of the catalogue.** `apps/web/lib/podcasts.ts` is
  deleted. `apps/api/src/catalog/data/catalog.seed.json` is now the only seed, and the
  direction of derivation is reversed from what ADR 0001 left behind.
- **`apps/api/**` joins the web service's `buildFilter.paths`** in `render.yaml`. Without
  it, a seed or ranking change would deploy a new API while the static site kept serving
  the old ranking, silently.
- **`NEXT_PUBLIC_API_URL` is gone** from `render.yaml` and `.env.example`. The browser
  never calls the API, so shipping its URL to the client would only be misleading.

## What stays in the web app

The API deliberately returns no colours. A card palette is a decision about this web
app's visual identity, not a fact about an episode, and a second client would want its
own. So `apps/web/lib/presentation.ts` holds the palette, keyed by show id, plus the
duration and speech-rate formatting. `apps/web/lib/catalogue.ts` does the joins the API
correctly refuses to do — episodes and shows come back separately, as a domain service
should return them, and the pages want one object per card.

`apps/web/lib/catalog-api.ts` re-declares the wire types rather than importing them
across the workspace. The contract between the two apps is HTTP, and the web app must
keep building if the API is deployed from a different commit. `assertEpisode` and
`assertRanked` are what stop that freedom from becoming silently blank pages: a shape
change fails the build naming the offending id, and an episode ranked without a `reason`
fails it outright.

## Consequences we accept

- **A catalogue change requires a web rebuild.** Correct for a seeded catalogue on a
  commit-driven deploy; it will not survive user-specific ranking or a real ingestion
  pipeline. When the catalogue becomes per-learner or updates between deploys, this
  decision gets revisited — the client in `catalog-api.ts` is already the seam where a
  runtime fetch would go, so revisiting it is a change to `catalogue.ts`, not a rewrite.
- **The web build depends on `apps/api` building first.** The root `build` script names
  the two workspaces in order rather than relying on `--workspaces` iterating
  alphabetically, and `build.mjs` fails with an explicit message if `apps/api/dist` is
  missing.
