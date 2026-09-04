# Handoff

State of the repo as of 2026-09-05, for whoever picks this up next.

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

**The Chinese DiscoPod teaches is Traditional, and that is now a decision** (2026-09-05).
[ADR 0010](docs/adr/0010-the-chinese-discopod-teaches-is-traditional.md).

Episode 101 was Simplified for no reason anyone chose — ADR 0009 picked a *recording*, and
its script became the product's answer by default. 101, its audio, its VTT, its seed file
and the whole `en → zh-Hans` pair are deleted. Pairs are derived from content
(`CatalogService.listPairs`), so the route left on its own.

**There is Traditional Mandarin on screen.** Episode **102**, `en → zh-Hant`: the opening
paragraph of the Chinese Wikipedia article on **海山漁港**, a fishing harbour on the Hsinchu
coast, read by **Yuriy kosygin** — the volunteer who wrote the article. CC BY-SA 4.0,
84 seconds, 17 cues, 5 vocabulary entries, 3 questions, measured at **144 cpm**.
`/en/zh-Hant/episode/102` prerenders; the build emits 9 routes.

**Read ADR 0010 before adding a third one.** Four things in it will bite:

- **The strain on ADR 0007 did not go away.** 102 has the same shape as 101 — one person
  reading an encyclopedia article, which the product would not choose over a podcast. Two
  attempts in, the reading is that freely-licensed Mandarin *programmes* are the scarce
  thing, not freely-licensed Mandarin audio. TED 中文 stays rejected on licence
  (CC BY-NC-**ND**; a transcript-first player is squarely a derivative).
- **A Commons `Zh-tw-` prefix is the narrator's accent, not the script.** Spoken Chinese
  Wikipedia is overwhelmingly Simplified-authored and several `Zh-tw-` files read Simplified
  articles, so the filename is no evidence at all. Evidence lives in the article: Traditional
  forms throughout, no `{{NoteTA}}`, and — the strongest signal — the `海山-{里}-` markup, a
  Traditional author suppressing auto-conversion of one character.
- **`mlx-whisper` decodes Mandarin into Simplified.** Cue *characters* come from the
  published wikitext; the ASR supplies *timings only*. Using its text would destroy the one
  property the episode was chosen for and pass every check in the repo. `ATTRIBUTION.md`
  says so in the file an editor will have open.
- **`cefr: "B1"` is still the wrong field name** (HSK or TOCFL, not CEFR, for Mandarin).
  ADR 0003 decision 7, sixth caller, second shipped wrong answer.

`description` is no longer the deviation ADR 0009 confessed to: `Episode.description` is
`Localized`, keyed by the learner's language, on the missing-key-is-exclusion rule.
`Show.description` stays scalar — nothing renders it and the overlay is keyed by episode id.

Seed files are named **by pair** (`catalog.en-zh-Hant.seed.json`), because
`catalog.zh-Hant.seed.json` would have sat next to the overlay `catalog.zh-Hant.json` and
meant something unrelated on the other axis.

Provenance lives in `apps/web/public/audio/ATTRIBUTION.md`, including the three text/audio
discrepancies. The rule applied to them is evidence, not precedence: where the ASR is
confident and reproducible it wins (the omitted 約 at 00:15, the added 以及…等 at 01:20);
where it is not, the published text stands and the disagreement is recorded (**北距** at
00:10, where the ASR hears 北至 and a re-decode returned a training-data watermark instead
of an answer). 北距 is kept out of the vocabulary list for that reason, and the unresolved
row is what `verifiedLesson: false` is paying for.

Eight defects surfaced by actually rendering the API's output, all fixed:

- `?topic=` was accepted by validation and then silently ignored.
- `Math.round(30/60)` made a 30-second episode read *"1 minutes"*.
- The `Math.floor` that fixed **that** made the 103-second Mandarin episode read
  *"1 minute"* in its ranked reason while its own card said *"2 min"*. The branch now tests
  the duration rather than the rounded minutes, so both ends hold.
- **`findOccurrence` could not find a Chinese word in a Chinese transcript.** All five of
  episode 101's vocabulary entries rendered *"we couldn't locate this word in the
  transcript"* against a transcript containing every one of them. The probe ladder is
  English morphology — split on spaces, stem the inflection, anchor on `\b` — and Han
  characters are not `\w`, so `\b佛塔` matches nothing, ever. A Han term is now matched as
  a substring, which is what "this word appears in this line" means in a script written
  without spaces.
- **The episode page's headline was a hardcoded claim about the audio.** *"Learn from a
  real conversation."* is true of the VOA lesson, where Anna and Pete talk to each other,
  and false of one person reading an article aloud. It now branches on `speakerCount`.
- **A ranked reason ended in two full stops.** `renderReason`'s English template appends
  `.` after the authored half (`reason.render.ts`), so a `levelReason` that punctuates its
  own end produces *"…a list of six fish.."*. The Chinese renderer has a comment warning
  about exactly this; the English one did not, and episode 102 walked into it.
- **The same reason stated 144 cpm twice** — once in the rendered prefix and once in the
  authored half restating it in words. Episode 101's `levelReason` had the same redundancy
  and nobody noticed, because nobody read the two halves as one sentence.
- **Chinese data was written with halfwidth punctuation.** Episode 102's transcript used
  ASCII `,` where the published article uses `，`, and the title used ASCII parentheses.
  In a Chinese-learning product the transcript is the material, so this was a fidelity bug,
  not a style preference. `catalog.zh-Hant.json` had the same halfwidth `,` `?` `!`
  throughout from an earlier session and was corrected with it — English `sourcePrompt`
  anchors and the deliberately-English question options were left alone.

The last five are the same lesson five times: **every one of them passed lint, typecheck
and build, and every one was only visible on screen.** There are no tests under `apps/`, so
rendering the page is the verification step, not a nicety.

**`npm run dev` does not start the web server.** The root script is
`npm run dev --workspaces --if-present`, which runs workspaces *sequentially*; the API's
`nest start --watch` never exits, so `@discopod/web` is never reached. `CLAUDE.md` documents
"web :3000, api :3001", which does not happen. Start them separately —
`npm run dev --workspace @discopod/api` and `npm run dev --workspace @discopod/web` — until
the root script is fixed to run them concurrently. Related: `nest start --watch` does **not**
watch the `assets` glob, so editing a seed JSON needs an API restart before the change is
served, and `next dev` caches the API's answers under `.next/cache/fetch-cache`
(`cache: 'force-cache'` in `catalog-api.ts`), so it needs one too.

**Not done:** the deploy of the cut-over — the commit below is pushed, but check Render
finished both services before trusting the live site.

## Next steps, in order

1. ~~**Get one Mandarin episode on screen.**~~ **Done 2026-09-05.** With `cpm` calibrated
   (ADR 0008) this was three pieces of ordinary work and no waiting. All three are done;
   what each one cost is kept below, because the next Mandarin episode walks the same path.
   - ~~`catalog.seed.ts` is hardcoded to one pair.~~ Done 2026-09-05. `loadSeedCatalog`
     reads a `SEED_FILES` list of `{ pair, file }` descriptors and merges them. Adding a
     Mandarin episode is now: drop a JSON file in `catalog/data/`, add one line to
     `SEED_FILES`. **Give it its own episode id range** — ids are global across seed files
     and a collision throws, deliberately, rather than overwriting.
   - ~~`GET /episodes` filters on `speaks` and not `learning`.~~ Done 2026-09-05.
     `EpisodeQueryDto.learning`, `CatalogService.isWrittenIn`, and both sides of the pair on
     every web request. An omitted `learning` means the *default pair*, not "no filter".
     `assertEpisode` on the web side checks it too, because an episode in the wrong
     `learning` is the failure that renders perfectly and is still wrong.
   - ~~The audio and the transcript themselves.~~ Done 2026-09-05, as episode 101, then
     redone as **episode 102** when ADR 0010 made the script a decision. The pipeline
     survived the swap unchanged and is worth repeating: **the ASR supplies the timings,
     the published text supplies the characters, and a disagreement is settled by
     evidence rather than by precedence.** `mlx-whisper` large-v3-turbo, run against the
     *shipped* mp3 rather than the source file so the timings are measured on what a
     learner actually hears — which also proves the excerpt is not clipped at either end.
     **The ASR's text is never the transcript**: it decodes Mandarin into Simplified, so
     for a Traditional catalogue that substitution is silent and total. Two things the
     loader needed on the way: an explicit `showId` (`slug()` returns `""` for a Chinese
     title, and both alternatives — pinyin, or a hash — are a guess or unreadable), and a
     `Show.licence` field, because a link credits the author while share-alike also
     requires naming the terms.

   Nothing here needed `reason.render.ts` touched for language — it already renders `cpm`
   in 字. It did need its duration branch fixed; see the defect note above.
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
