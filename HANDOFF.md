# Handoff

State of the repo as of 2026-09-04, for whoever picks this up next.

## What this is

DiscoPod — a podcast app for language learners, ranked by whether a learner can follow
an episode by ear rather than by charts or recency. Read in this order:

1. [docs/VISION.md](docs/VISION.md) — the product. Written by the owner; treat it as the spec.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system shape, and an explicit table of what is built vs not.
3. [docs/adr/0001-…](docs/adr/0001-decouple-from-cloudflare-and-add-nestjs-api.md) — why the stack looks like this.
4. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deploy paths and the traps already hit.

It started as a Codex-generated single-page site called "Tuned" hosted on OpenAI's sites
platform, which answered HTTP 401 to anonymous visitors. It has since been rebuilt as an
npm-workspaces monorepo with no vendor coupling.

## Where things stand

**Done and verified in a clean checkout** (`npm ci --include=dev` → lint → typecheck →
build → static export → API boot + HTTP smoke test, all under `NODE_ENV=production`):

- `apps/web` — Next.js 16, React 19 RSC. Every route prerenders; `STATIC_EXPORT=1` yields
  a complete static `out/`.
- `apps/api` — NestJS 11. Catalogue, difficulty profiles, suitability ranking, `start-here`
  with stated reasons, saved words. Storage behind `CatalogRepository` with an in-memory adapter.
- `render.yaml` — Blueprint for both services. Deployed; see below.
- `.github/workflows/ci.yml` — mirrors Render's build exactly.

**Pushed, and CI is green** (2026-09-04). The repo is public at
<https://github.com/williamlabdev/discopod>: a single root commit `da78d1a`, 120 files,
`main` tracking `origin/main`. `../upload-to-github.sh` did the wipe-and-reinit, so the old
ChatGPT sites remote and the `clean-main` / stale `main` branches are gone with the discarded
`.git` — there is nothing left to tidy. CI run
[33861169089](https://github.com/williamlabdev/discopod/actions/runs/33861169089)
passed in 1m13s: `npm ci --include=dev`, lint, typecheck, build, the static-export check and the
API smoke test.

**Deployed** (2026-09-04). Blueprint `discopod` (`exs-dad9mvbncjis738h68mg`) built both
services from `b92129d`:

| Service | URL | Notes |
| --- | --- | --- |
| `discopod-web` | <https://discopod-web.onrender.com> | Static, never sleeps. Build 8m25s. |
| `discopod-api` | <https://discopod-api.onrender.com> | Free plan — sleeps after 15 min idle, ~50s cold start. Build 8m07s. |

Verified live against the checklist in `docs/DEPLOYMENT.md`: `/api/health` answers,
`start-here?level=Beginner` returns an episode carrying its `reason`, and the API's
`access-control-allow-origin` is the web origin, so `WEB_ORIGIN` is wired correctly.
`buildFilter` was confirmed by accident and then on purpose: the docs-only commit
`3d6c228` produced no deploy on either service.

**The web app reads from the API.** `apps/web/lib/podcasts.ts` is deleted; the catalogue
comes from `@discopod/api` over HTTP during `next build`, so the static export keeps its
speed and the deployed site never waits on the sleeping API. Cards show the suitability
the API computes instead of the old hand-written `match` numbers. Reasoning and the
rejected runtime-fetch alternative: [ADR 0002](docs/adr/0002-fetch-the-catalogue-at-build-time.md).

Two defects surfaced by actually rendering the API's output, both fixed: `?topic=` was
accepted by validation and then silently ignored, and `Math.round(30/60)` made a
30-second episode read *"1 minutes"*.

**Not done:** the deploy of the cut-over — the commit below is pushed, but check Render
finished both services before trusting the live site.

## Next steps, in order

1. **Persistence.** Write a Postgres adapter for `CatalogRepository` and bind it in
   `CatalogModule`; the in-memory one stays for tests. Saved words need the same treatment.
2. **Then** the larger vision pieces: RSS ingestion, the ASR/translation pipeline, learner
   auth (the `x-learner-id` header is a placeholder), and the completion-by-level ranking signal.

## Traps already paid for — do not re-learn these

- **Lockfile.** Regenerate only with `npm install --package-lock-only --include=dev`. A plain
  `npm install` records optional native packages for the current platform only, and `npm ci`
  then dies on another OS with *"Cannot find native binding"* ([npm/cli#4828](https://github.com/npm/cli/issues/4828)).
  This already broke a macOS run once via `@oxlint/binding-darwin-arm64`.
- **devDependencies.** Build commands must use `npm ci --include=dev`. Under
  `NODE_ENV=production` a plain `npm ci` omits dev deps and the builds fail on missing
  `@tailwindcss/postcss` (web) and `@nestjs/cli` (api).
- **Node version.** Pinned to 22.13.0 in three places (`.nvmrc`, `engines`, `NODE_VERSION` in
  `render.yaml`). Render's own default is Node 24. Run `nvm use` before working locally.
- **Google Fonts.** Geist is self-hosted via the `geist` package on purpose — `next/font/google`
  needs build-time egress to fonts.googleapis.com and fails in offline CI. Don't switch back.
- **Don't reintroduce** `vinext`, `@cloudflare/vite-plugin`, `wrangler`, or
  `@openai/sites-vite-plugin`. Removing them is the whole point of ADR 0001.

## Conventions

- `apps/web/components/ui/**` and `hooks/use-mobile.ts` are vendored shadcn output and are
  excluded from lint. Regenerate them with the shadcn CLI; don't hand-maintain them.
- `apps/api/src/catalog/data/catalog.seed.json` is the catalogue's single source. The web
  app has no copy — it fetches from the API at build time. Edit the seed, not the UI.
- The web build depends on `apps/api/dist`. The root `build` script names the two workspaces
  in order for that reason; don't put it back to `--workspaces`, which only works by
  alphabetical luck. `apps/api/**` is in the web service's `buildFilter` for the same reason:
  drop it and a seed change deploys a new API while the site serves the old ranking.
- Every ranked result carries a `reason`. The vision's "state the reason" principle is enforced
  by the return type — keep it that way.
- The completion-by-level ranking signal is deliberately absent, not stubbed. Do not fake an
  engagement signal; a fabricated one is indistinguishable from the chart ranking this product
  exists to replace.
- Architectural changes get an ADR in `docs/adr/`.

## Verify anything with

```bash
rm -rf node_modules apps/*/node_modules
npm ci --include=dev
npm run lint && npm run typecheck && npm run build
STATIC_EXPORT=1 npm run build --workspace @discopod/web   # → apps/web/out/index.html
node apps/api/dist/main.js &                              # → curl localhost:3001/api/health
```

## Loose ends outside the repo

Cleared on 2026-09-04, once the repo was pushed and CI was green. The parent `work/` folder
held `_to_delete/` (empty by then), `_transfer/` (three tarballs used to move code between
machines), five `tuned-*.tar.gz` build artifacts — four loose plus `artifacts/tuned-v5.tar.gz` —
and `social-card/` and `learning-social-card/`, both byte-identical to files already committed
(`docs/social-preview-v1.png` and `apps/web/public/og.png` respectively, verified by sha256),
plus a stray `work/package-lock.json` that belonged to nothing. About 33 MB. All of it went to
the macOS Trash rather than `rm`, so it is still recoverable if something turns out to have been
needed.

Two files remain there, neither referenced by the repo. `demo.sh` builds a standalone static
export of the web app for any dumb static host (`SITE_URL=https://… bash demo.sh`) — worth
keeping. And `upload-to-github.sh`. It has done its job and now refuses to run again: it
aborts if `origin` already points at the repo (`FORCE=1` overrides). Two bugs in it were fixed
on 2026-09-04 after they bit — an unbraced `$REPO` immediately followed by a full-width paren
was scanned as one variable name and died under `set -u`, and the script did no `nvm use`, so it
validated with whatever Node happened to be active. It now preflights Node version and `gh`
login *before* it deletes `.git`, rather than after.

## Unverified

The Dockerfiles and `compose.yaml` have never been built — there was no Docker daemon
available. Render's own build environment has not been exercised either; CI is the closest
approximation.
