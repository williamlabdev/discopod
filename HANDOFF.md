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
- `render.yaml` — Blueprint for both services. Not yet deployed.
- `.github/workflows/ci.yml` — mirrors Render's build exactly.

**Not done:**

- **The repo has never been pushed.** `origin` still points at the old ChatGPT sites remote.
  `../upload-to-github.sh` is the intended path: it wipes `.git`, re-inits with a single clean
  commit, and pushes to `williamlabdev/podcast-discovery` as a public repo.
- Current local branch is `clean-main`; the stale `main` and `remotes/origin/main` still exist.
  The upload script discards all of it, so don't spend effort tidying branches.
- Nothing has been deployed to Render yet.
- **The web app does not call the API.** It still reads `apps/web/lib/podcasts.ts`, which
  duplicates `apps/api/src/catalog/data/catalog.seed.json`. Closing this is the next
  meaningful change — see *Next steps*.

## Next steps, in order

1. **Push.** `cd .. && bash upload-to-github.sh`, then confirm the CI run goes green.
2. **Deploy.** Render → New → Blueprint → connect the repo → fill the three prompted URLs
   (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `WEB_ORIGIN`). Note the free API instance
   sleeps after 15 minutes idle and takes ~1 minute to wake; the static site does not sleep.
3. **Cut the web app over to the API.** Replace the `lib/podcasts.ts` import with fetches to
   `NEXT_PUBLIC_API_URL`. This ends the duplication and is the point at which the API stops
   being decorative. Note it also ends the pure static export — plan which build mode you want.
4. **Persistence.** Write a Postgres adapter for `CatalogRepository` and bind it in
   `CatalogModule`; the in-memory one stays for tests. Saved words need the same treatment.
5. **Then** the larger vision pieces: RSS ingestion, the ASR/translation pipeline, learner
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
- `apps/api/src/catalog/data/catalog.seed.json` is generated from `apps/web/lib/podcasts.ts`,
  not hand-edited. Until step 3 above lands, the two must not drift.
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

In the parent `work/` folder: `_to_delete/` (the pre-restructure tree and its old
`node_modules`), `_transfer/` (tarballs used to move code between machines), five
`tuned-*.tar.gz` build artifacts, `social-card/` and `learning-social-card/` (the latter is
byte-identical to `apps/web/public/og.png`), and a stray `work/package-lock.json` that belongs
to nothing. All are safe to delete; none are referenced by the repo.

## Unverified

The Dockerfiles and `compose.yaml` have never been built — there was no Docker daemon
available. Render's own build environment has not been exercised either; CI is the closest
approximation.
