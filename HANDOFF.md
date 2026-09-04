# Handoff

State of the repo as of 2026-09-04, for whoever picks this up next.

## What this is

DiscoPod — a podcast app for language learners, ranked by whether a learner can follow
an episode by ear rather than by charts or recency. Read in this order:

1. [docs/VISION.md](docs/VISION.md) — the product. Written by the owner; treat it as the spec.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system shape, and an explicit table of what is built vs not.
3. [docs/adr/0001-…](docs/adr/0001-decouple-from-cloudflare-and-add-nestjs-api.md) — why the stack looks like this.
4. [docs/adr/0003-…](docs/adr/0003-model-the-learner-language-pair.md) — the language-pair model. Read before touching the catalogue types, ingestion, or routes.
5. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deploy paths and the traps already hit.

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

**Pushed** (2026-09-04). The repo is public at
<https://github.com/williamlabdev/discopod>: a single root commit `da78d1a`, 120 files,
`main` tracking `origin/main`. `../upload-to-github.sh` did the wipe-and-reinit, so the old
ChatGPT sites remote and the `clean-main` / stale `main` branches are gone with the discarded
`.git` — there is nothing left to tidy. CI run
[33861169089](https://github.com/williamlabdev/discopod/actions/runs/33861169089)
passed in 1m13s: `npm ci --include=dev`, lint, typecheck, build, the static-export check and the
API smoke test.

**Then CI went red for five commits and stayed red without anyone noticing** — `ff9a9d2`
through `df83ec1`, 2026-09-04 13:06 to 14:58. Not a real regression: lint, typecheck and
both builds passed every time. The `Verify static export` step was asserting
`out/episode/1.html` and grepping `'% fit'` out of `out/index.html`, and ADR 0003 had
moved every catalogue page under `/[speaks]/[learning]/` while ADR 0004 had removed
episodes 1–6. The check was testing the shape of a site that no longer existed. Fixed in
`bf8ac19` against a real `out/` tree, and green again on the next run:
[33887340846](https://github.com/williamlabdev/discopod/actions/runs/33887340846),
1m12s, `success`.

The lesson is about this file, not about the workflow: the paragraph above said "CI is
green" and stayed there while five red runs went past, because it was written once and
never re-checked. **A claim about CI in this file is a claim about a specific run id.**
If you cannot name the run, write what you actually verified locally instead.

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
That decision was re-examined against R24 and upheld — generated learner support is
catalogue content and is built, not served:
[ADR 0005](docs/adr/0005-generated-learner-support-is-a-build-artifact.md).

**The language model has been split before the first Mandarin episode, not under it.**
`LanguageTag` (`en` / `zh-Hant` / `zh-Hans`) was answering two questions at once: which
text to show a reader, and what language the audio is. `Show.language` is now a
`SpokenLanguage` (`'en' | 'cmn'`), and a pair's `learning` side comes from the new
`Episode.transcriptLanguage` rather than from the show — so one Mandarin show serves both
scripts without a duplicate show row, and `rateUnitFor` stops being keyed by a writing
system. [ADR 0006](docs/adr/0006-separate-spoken-language-from-written-form.md).

**FSI is a fixture, not a source, and the Mandarin direction is blocked on permission.**
FSI's *Standard Chinese* was the only Mandarin audio available without asking anyone —
public domain, complete on archive.org. Six tapes were measured. The drill tapes are
40–51% silence with speech in 1–2 second fragments, and module 09 is the opposite:
continuous connected speech, one tape running 27 minutes without a detected pause. It is
still not catalogue content — no aligned text, and a `cpm` measured off 1970s language-lab
audio would be precise and false. So it becomes the ASR pipeline's test fixture.
[ADR 0007](docs/adr/0007-fsi-is-a-pipeline-fixture-not-a-catalogue-source.md).

**And then ADR 0007 said the wrong thing about what happens next, which is worth reading
before trusting anything else in this file.** It concluded that the Mandarin direction was
blocked on permission from a publisher. It is not, and the mistake is instructive:
`COMFORTABLE_RATE` is a claim about what a *listener* can follow, not a property of any
recording, so no source — licensed, public domain or otherwise — was ever going to supply
it. A whole next-step ordering was built on a blocker that did not exist. The row is now
filled: `cpm` = 170 / 220 / 280, extrapolated from the `wpm` row at the same ratios to
conversational speed, owned and labelled as extrapolation rather than measurement.
[ADR 0008](docs/adr/0008-calibrate-cpm-by-extrapolation-and-label-it.md).

**So no Mandarin episode is blocked on anybody's reply any more.** What is left is
ordinary work, listed below.

Two defects surfaced by actually rendering the API's output, both fixed: `?topic=` was
accepted by validation and then silently ignored, and `Math.round(30/60)` made a
30-second episode read *"1 minutes"*.

**Not done:** the deploy of the cut-over — the commit below is pushed, but check Render
finished both services before trusting the live site.

## Next steps, in order

1. **Get one Mandarin episode on screen.** With `cpm` calibrated (ADR 0008) this is now
   three pieces of ordinary work and no waiting:
   - `catalog.seed.ts` is hardcoded to one pair — `SEED_PAIR`, `SEED_SPOKEN` and
     `authoredInSeedLanguage()` between them fix every language fact in the file. Its own
     comment names the extension: *"A second script arrives the way a second language does
     — as its own file, not as a column."* So `loadSeedCatalog` takes a `{ pair, path }`
     descriptor and runs once per seed file.
   - `GET /episodes` filters on `speaks` and not `learning`, and `lib/catalogue.ts:233`
     passes only `pair.speaks`. Until both take `learning`, a Mandarin episode also appears
     on the `en → en` page. ADR 0006 predicted this exact bug; it is now reachable.
   - The audio and the transcript themselves. There is no local ASR on this machine (only
     `ffmpeg`), so a source that publishes a script *alongside* its audio is worth much more
     than a better-sounding one that does not.

   Nothing here needs `reason.render.ts` touched — it already renders `cpm` in 字.
2. **Write to Taiwanese Mandarin podcasters.** Still worth doing, for content rather than
   as a prerequisite: leads are Cozy Mandarin, Convo Chinese, Learn Taiwanese Mandarin.
   It no longer blocks anything, so it runs in parallel with everything below.
3. **Persistence.** Write a Postgres adapter for `CatalogRepository` and bind it in
   `CatalogModule`; the in-memory one stays for tests. Saved words need the same treatment.
4. **Then** the larger vision pieces: RSS ingestion, the ASR/translation pipeline, learner
   auth (the `x-learner-id` header is a placeholder), and the completion-by-level ranking signal.
   The ASR pipeline has a fixture waiting for it — see the Mandarin fixture section in
   `apps/api/src/ingest/README.md`. It is a fixture, not content.

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
