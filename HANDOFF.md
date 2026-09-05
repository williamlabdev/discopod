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
  with stated reasons, saved words. Storage is behind ports with two adapters each, chosen
  by `DATABASE_URL` — in-memory by default, Postgres when it is set.
- `render.yaml` — Blueprint for both services. Deployed; see below.
- `.github/workflows/ci.yml` — mirrors Render's build exactly. Runs on **every branch
  push**, and exactly once per commit: once a PR is open, a push fires both `push` and
  `pull_request`, so the job skips the `pull_request` run for branches in this repo. The
  push run still appears in the PR's checks, because check runs attach to the SHA rather
  than to the event. `pull_request` stays declared for forks, whose pushes never reach
  this repo. Before 2026-09-05 this only ran on `main` and on PRs, so a feature branch got
  no run until someone opened a PR — the first red run arriving after the work was done.

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

**Current `main` is `a4be159`** (2026-09-05) — a docs-only edit to this file, and the
second one in a row to prove the point that the sentence you are reading goes stale the
moment it lands. CI on it: run
[33932572583](https://github.com/williamlabdev/discopod/actions/runs/33932572583),
`success`. Before it, `4dd83a6`, run
[33931835378](https://github.com/williamlabdev/discopod/actions/runs/33931835378),
`success`; that one arrived by fast-forward
(`git push origin handoff-post-adr-0010:main`) rather than by a squash, so there is no
`(#4)` merge commit even though PR
[#4](https://github.com/williamlabdev/discopod/pull/4) shows as merged — GitHub closes a
PR whose head lands on the base by any route.

Before those, `81b22c6` — PR [#3](https://github.com/williamlabdev/discopod/pull/3) (the CI
trigger) and PR [#2](https://github.com/williamlabdev/discopod/pull/2) (ADR 0010 and
everything below), CI run
[33931234382](https://github.com/williamlabdev/discopod/actions/runs/33931234382),
`success`. That is the commit the deployed site was built from; `4dd83a6` and `a4be159` are
docs-only and `buildFilter` skipped both.

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

Ten defects surfaced by actually rendering the API's output, all fixed:

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
- **A highlighted term was given a word-space in a script that has none.**
  `TranscriptLine` wrapped the match in `<mark className="… px-1 …">`, which reads as the
  highlight hugging an English word because English text already has spaces around it. In
  Chinese it renders as 「海山 漁港 ，」, and a space inside Chinese text is not decoration:
  it is a claim about where one word ends, made to the reader least able to tell. The
  padding is now `px-0` for a Han term. **Same lesson as `findOccurrence` above** — English
  typography assumptions do not survive contact with Han text, and that is now twice.
- **The discovery page's eyebrow was a hardcoded claim about the audio**, the third of
  these. *"Learn through real conversations"* is false for `/en/zh-Hant`, whose only
  episode is one person reading aloud. Unlike the episode headline it is a site-wide brand
  line, so branching on `speakerCount` was the wrong fix: this page describes the product,
  not a recording, and the only claim the product can always keep is about **its own
  behaviour**. It now states the method — *"Ranked by what you can follow"*, VISION's test.
  Deliberately not derived from the catalogue: a brand line that changes when a second
  episode lands is not a brand line.

Two more were found by reading the code rather than by looking at it, and both were silent:

- **`text.split(term)` destructured to `[before, after]`** dropped everything past a second
  occurrence of a vocabulary term in one cue — a transcript line quietly losing its tail.
  Now `indexOf` plus `slice`.
- **Seed `time` strings disagreed with what `cueTime(startMs)` renders** (`00:02` against a
  displayed `00:03`, seven cues in all). Harmless on screen, because the page renders from
  `startMs`. Not harmless later: `cueTime` is the **key** an overlay's transcript is looked
  up by, so a future `zh-Hant` overlay of this episode would have missed those lines. All
  `time` values now equal `round(seconds)`.

The rendered ones are the same lesson seven times: **every one of them passed lint,
typecheck and build, and every one was only visible on screen.** The tests added with the
storage work (2026-09-05) cover the repositories and nothing above them, so for anything
that renders, opening the page is still the verification step rather than a nicety.

**And the same false claim was in three places, of which the code was only one.** The
eyebrow above, the `og:` and `twitter:` descriptions — what a shared link actually shows —
and `apps/web/public/og.png`, which was **three revisions stale at once**: branded "Tuned",
captioned *"Learn English through real conversations"*, and drawing an A1–C2 ladder, the
CEFR scale ADR 0003 decision 7 has still not settled. Three separate text corrections
landed in the markup and none of them reached the picture, because nobody opens a PNG to
check whether it still agrees with the product. It was rendered on the front page too, so
the stale artwork was not only in share cards. **There is now deliberately no share
image**: the twitter card drops to `summary`, the learning-list band is one column, and
`layout.tsx` says what must be true before an image comes back. A link with no card looks
worse than one with a card; a card that contradicts the product is worse than both.

**`npm run dev` starts both servers again** (fixed 2026-09-05). It had been
`npm run dev --workspaces --if-present`, which runs workspaces *sequentially*: the API's
`nest start --watch` never exits, so `@discopod/web` was never reached and the documented
"web :3000, api :3001" was silently "api :3001 only". The root script is now
`node scripts/dev.mjs`, which starts the API, waits for `/api/health`, then starts
`next dev` — the same handshake `apps/web/scripts/build.mjs` makes for the build, and for
the same reason: the web app fetches its catalogue from the API on every dev render, so a
page loaded before the API answers fails with `Catalogue API unreachable`. Three things
the script does on purpose:

- **Children get their own process groups.** `nest start --watch` runs the app as a
  *grandchild*, so a kill aimed at nest alone leaves :3001 held. Ctrl-C reaches only the
  script, which then kills both groups; either server exiting on its own takes the other
  down rather than leaving half a stack up.
- **An API already answering on the port is left alone** — it is someone's
  `npm run dev:api`, or a leftover, and restarting it is not the dev script's business.
  The line it prints says which branch it took.
- **`API_PORT` / `WEB_PORT` move both ends of the wire**, deriving `CATALOG_API_URL` and
  `WEB_ORIGIN`, rather than leaving `catalog-api.ts`'s hardcoded `DEV_FALLBACK` to agree
  with a port it never hears about.

Verified 2026-09-05 on Node 22.13.0, both branches: with :3001 already taken it started
web only, and on `API_PORT=3101 WEB_PORT=3100` it started both, served
`/en/zh-Hant` 200, and left no listener or stray `nest`/`next` process behind after
Ctrl-C (exit 130).

**What is still true**: `nest start --watch` does **not** watch the `assets` glob, so
editing a seed JSON needs an API restart before the change is served, and `next dev`
caches the API's answers under `.next/cache/fetch-cache` (`cache: 'force-cache'` in
`catalog-api.ts`), so it needs one too. The dev script deliberately does not clear that
cache — a `npm run dev` that silently discarded caches would hide the trap rather than
fix it.

**The live site is serving all of this** (checked 2026-09-05 00:00 UTC, after the `81b22c6`
deploy). <https://discopod-web.onrender.com/en/zh-Hant> carries *"Ranked by what you can
follow"*, `/en/zh-Hant/episode/102` answers 200 with the fullwidth title
海山漁港（條目導言）, `/en/zh-Hans` is 404 as intended, and no `og:image` is emitted.

**But `/og.png` still answers 200 with the deleted 2 MB image**, and that is a finding
about Render, not about this repo. Compare `last-modified`:

| Path | `last-modified` |
| --- | --- |
| `/` | Fri, 04 Sep 2026 23:56:10 UTC |
| `/en/zh-Hant` | Fri, 04 Sep 2026 23:56:10 UTC |
| `/og.png` | Fri, 04 Sep 2026 **22:28:38** UTC |

The pages come from the new deploy; the image is from the one before it, and a
cache-busting query string still returns the PNG rather than a 404. **A Render static
deploy publishes the new `out/` without removing files that are no longer in it.** Nothing
on the site references `/og.png` any more, so this is a stale URL rather than a live
mistake — but assume the same for every asset you delete: the file keeps being served, and
"I removed it from the repo" is not "it is gone". Clearing it needs Render's own cache
clear or a redeploy that replaces the publish directory wholesale; neither was done here.

**The site serves two directions, and only two** (2026-09-05). It was publishing three
pairs: `en → zh-Hant` (an English speaker learning Chinese, episode 102), `zh-Hant → en`
(a Chinese speaker learning English, episode 7 through its overlay) — and `en → en`,
English audio explained in English, which teaches nobody anything and was the *first*
option on the pair chooser with `DEFAULT_PAIR` pointing at it. ADR 0003 decision 6 declared
that pair deliberately when it was the only one with content; that reason expired the
moment both real directions had an episode. `listPairs` now skips any pair whose two sides
match, `DEFAULT_PAIR` is `en → zh-Hant`, and the export goes from 9 HTML files to 7. No
data was deleted — episode 7's English explanations are what the Chinese overlay was
translated from. [ADR 0012](docs/adr/0012-two-directions-and-en-to-en-is-not-one.md).

**Saved words survive a restart** (2026-09-05). They used to live in a `Map` inside
`VocabularyService`, so every API restart threw away everything anyone had saved — the one
thing in this app that cannot be regenerated from git. There is now a `pg`-backed adapter
behind `VocabularyRepository`, and a second one behind `CatalogRepository`, both selected
by `DATABASE_URL`. What to know before touching it, in full in
[ADR 0011](docs/adr/0011-postgres-is-a-publication-of-the-seed.md):

- **Unset `DATABASE_URL` is a supported mode, not a broken one.** It is what CI and the web
  build run — `apps/web/scripts/build.mjs` boots the API during `next build`, and a build
  must not require a database. Set-but-unreachable is the opposite: the boot fails on
  purpose. An API answering `ok` while discarding saved words is worse than one that is down.
  `/api/health` now says `storage: "postgres" | "memory"`, and CI asserts it.
- **The seed JSON is still the single source.** Postgres holds a publication of it: each
  boot hashes the loaded catalogue and republishes if the digest moved. Editing a catalogue
  row in the database is not a way to change the catalogue — the next boot overwrites it.
- **Catalogue rows are `jsonb` documents with an explicit `position` column.** `sort=recent`
  returns repository order (the seed has no dates), so ordering is part of the API contract
  and every read says `order by position`.
- **Every catalogue read is still a full-table read.** The port has no query pushdown; the
  service filters and ranks in memory exactly as before. Fine at two episodes, wrong at a
  thousand, and deferred rather than missed.
- **`render.yaml` is deliberately untouched.** Declaring a database in a Blueprint
  provisions a real one on merge, which is William's call; `docs/DEPLOYMENT.md` carries the
  exact snippet, and Render's free Postgres expires after 30 days anyway.

Verified against a local `postgres:17` container: migration, publication and its no-op on
the second boot, a saved word surviving a restart, and an unreachable `DATABASE_URL`
exiting 1 without ever listening. `npm test` is 17 tests, 14 of which need
`TEST_DATABASE_URL` and skip without it; CI runs a `postgres:17` service container so that
skip cannot go unnoticed — CI run
[33937079531](https://github.com/williamlabdev/discopod/actions/runs/33937079531) is green
with all 17 running there, and the second smoke test answering `"storage":"postgres"`.

## The catalogue is nine episodes, not two (2026-09-05)

Both pairs had exactly one episode each, which is enough to prove a pipeline and not enough
to rank anything. Seven were added: **five English**, so a Chinese speaker learning English
has something to move between, and **two Mandarin**, so the other direction is not a single
fishing harbour.

| Pair | Episodes | Source |
| --- | --- | --- |
| `zh-Hant → en` | 7, **8, 9, 10, 11, 12** | VOA *Let's Learn English*, Lessons 1, 2, 4, 5, 6, 10 |
| `en → zh-Hant` | 102, **103, 104** | Spoken Chinese Wikipedia — 海山漁港, 鄧福如, 吳宗憲（音樂家） |

Lessons 3, 7, 8 and 9 were skipped, not missed: they are grammar-drill or pronunciation
segments rather than dialogues, so there is no conversation to rank for followability.

**The two new Mandarin episodes are still encyclopedia readings**, so the strain on ADR 0007
recorded above is unchanged and now three deep. What did improve: 吳宗憲（音樂家） is the first
one whose Commons page **cites the article revision itself** (`oldid=48124446`), instead of
leaving it to be reconstructed from an upload date. Prefer files with a `Speaker:` field and
a cited `oldid` — they exist, and they remove the weakest link in the attribution chain.

**The overlay is keyed by rounded seconds, not by the seed's `time` string.**
`catalog.overlay.ts`'s `cueTime` is `MM:SS` of `Math.round(startMs / 1000)`, while the seed's
decorative `time` field is not always the same rounding. A translation keyed off the seed
string silently fails to attach — no error, just an untranslated cue. All 85 new cue
translations are generated from `Math.round(seconds)`, and no lesson has two cues rounding
to the same second (checked, because that would be a silent overwrite).

**Three of the seven speech rates in the seed did not reproduce.** Lesson 2 was written as
120 wpm and measures 112; Lesson 5 said 100 and measures 97; Lesson 6 said 84 and measures 83;
鄧福如 said 177 cpm and measures 172; 吳宗憲 said 178 and measures 173. All are now recomputed
under one stated convention — **words (or Han characters, digits excluded) over the speech
span**, first onset to last offset, internal pauses in, leading and trailing silence out — and
the prose in `levelReason` that quoted the old numbers moved with them. The convention, and
the reasons for the two loudness decisions below, are
[ADR 0013](docs/adr/0013-measure-the-rate-over-the-speech-span.md); the measurements
themselves are in `ATTRIBUTION.md`, so the next number can be checked rather than trusted.

**The five VOA files ship byte-for-byte unmodified**, confirmed by `content-length` on the
source URL. That has a visible cost: their integrated loudness spans **8 dB** (−25.2 to
−17.1 LUFS), so a learner moving from Lesson 1 to Lesson 5 reaches for the volume. Normalising
them was rejected — public-domain status permits it, but modifying a publisher's audio to
match two Wikipedia readings that had to be normalised for an unrelated reason is the less
honest of the two options. The variance is written down in `ATTRIBUTION.md` instead, and it is
reversible the day the player grows a gain control.

**The two Mandarin excerpts needed *dynamic* loudness normalisation**, where 海山漁港 got
linear. 鄧福如 measures `input_i −25.60 LUFS` against `input_tp −7.56 dBTP`: +9.6 dB of gain
wanted, 7.6 dB of headroom available, so linear clips. 吳宗憲 is the same shape with smaller
numbers. Dynamic normalisation changes the internal level relationships of a recording, so it
is declared as a modification under BY-SA rather than filed under transcoding.

**A second episode under a show exposed a false attribution.** `sourceUrl` and `licence`
lived only on `Show`, and a `Show` is built from whichever seed row claims its id first — so
all three spoken-Wikipedia episodes credited 海山漁港's Commons file, and five VOA lessons
linked to Lesson 1's page. Under BY-SA, crediting the wrong author is a licence breach, not a
stale link. Both fields now exist on `Episode` too, and resolution is **episode first, show as
fallback**: a show whose episodes really do share one source states it once, and a corpus-shaped
"show" states it per episode. Verified in the built HTML, not in the source.

**The credit line no longer claims a modification nobody made.** Fixing the above gave the six
VOA episodes a licence, and the sentence printed for anything with a licence read *"Excerpted
and re-timed for language learning"* — false for files that ship byte for byte. `audioModified`
is now a seed field: set on the three excerpts, absent on the six VOA lessons, which instead
print *"The publisher's own file, unmodified; only the cue timings were added here."* Same
class as commit "stop claiming what the audio is not" (#2), and the same rule — the page states
what was done, and nothing more.

**Still unverified by ear.** Every excerpt boundary was settled on pause structure, character
counts and ASR text — nobody in this session could listen to the audio. Both cuts land on a
complete published text unit (鄧福如 = the lead exactly, 吳宗憲 = the `== 生平 ==` section
exactly) and both deliberately exclude the reader's spoken section numbers, which are not in
the published text and so cannot be transcribed under ADR 0010. That is the same gap ADR 0010
decision 5 recorded rather than closed.

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
3. ~~**Persistence.**~~ **Done 2026-09-05.** Postgres adapters for both
   `CatalogRepository` and `VocabularyRepository`, selected by `DATABASE_URL`; the
   in-memory ones stay and are what the build runs. See the section above and ADR 0011.
   What it leaves for whoever follows: **provision the database somewhere** (the Render
   snippet is in `docs/DEPLOYMENT.md`, unapplied), and **push filtering into the port**
   before the catalogue is big enough for a full-table read to matter.
4. **Then** the larger vision pieces: RSS ingestion, the ASR/translation pipeline, learner
   auth (the `x-learner-id` header is a placeholder — saved words are now durable *and*
   unauthenticated), and the completion-by-level ranking signal.
   The ASR pipeline has a fixture waiting for it — see the Mandarin fixture section in
   `apps/api/src/ingest/README.md`. It is a fixture, not content.

Small and unowned: **a share image**. There is deliberately none right now (see above), so a
shared link renders as a plain `summary` card. Whoever makes the replacement reads the doc
comment in `apps/web/app/layout.tsx` first — it lists the three things the old one got wrong
— and re-adds `openGraph.images`, `twitter.images` and `card: 'summary_large_image'`
together, in one change. An image is worth having; it is not worth having stale.

**R24 has a UI mock, and that is all it has.** `/demo/in-other-words` renders the three
rungs — original, elaborated restatement with the hard expression kept and marked, then the
translation — from a hand-written fixture under `apps/web/app/demo/`, deliberately outside
`lib/` so nothing else can import it and outside `/[speaks]/[learning]/` so it cannot look
like a catalogue episode that carries a restatement. One cue ships the degraded case on
purpose (criterion 9: generation dropped the tapped expression, so rung 2 is hidden and rung
3 offered directly), because a demo that only shows the feature succeeding hides the exact
behaviour R24's risk section turns on. The show and episode are invented, which is the one
place in this repo that happens; the page says so, the fixture header says why it is allowed
here and ADR 0004 says what would make it not. **Nothing is generated** — the generator R24
needs is a build-time artifact per ADR 0005 and does not exist.

**The learning list and the vocabulary list exist now** — `/[speaks]/[learning]/list` and
`/[speaks]/[learning]/words`, both prerendered per pair. Two things they changed underneath:
discover's bookmark was `useState` and nothing else, so it never survived a reload, and the
storage schema was built and parsed inline in the episode page by its only reader. Both now
go through `apps/web/lib/learner-store.ts`, which owns the key format, the parser and the
list. The episode page imports it rather than keeping a second copy.

What the pages deliberately do not do: **no progress bar.** The catalogue's `duration` is the
publisher's stated length, not measured from the file we ship, so a percentage would be drawn
against a denominator nobody has checked — the list prints the position (`00:18`) instead.
And **no `t=` jump**: a saved word shows its timestamp because that is the fact stored with
it, but the link to the episode is a plain link, because nothing on the episode page reads a
start time out of the URL yet.

Both pages fall back to a **labelled sample** when the device has nothing stored. The episodes
and the vocabulary in it are real — straight from the pair's own catalogue, so every title,
level, gloss and link is true — and the learner state around them (positions, counts, "you
saved this") is invented, said so in a panel above it, and never written to storage. Same rule
as the R24 demo: a mock-up may borrow real content, and must not claim to be real state.

## Traps already paid for — do not re-learn these

- **Lockfile, twice over.** Regenerate only with `--package-lock-only --include=dev`, and run
  it through **npm 11** (`npx -y npm@11 install --package-lock-only --include=dev`). The npm
  bundled with Node 22.13.0 (10.9.2) silently stripped 54 `"libc": ["glibc"]` entries — a
  154/165 diff for a change that should have been 154/3. `libc` is how npm picks musl vs
  glibc binaries, so the tool meant to prevent the platform trap below introduced it.
  Read the diff for `libc` removals before committing. (Found 2026-09-05 adding `pg`.) A plain
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
- **`create table if not exists` is not atomic against a concurrent create.** Two callers
  reaching it together fail with `duplicate key value violates unique constraint
  "pg_type_typname_nsp_index"`. `CatalogModule` and `VocabularyModule` both migrate and Nest
  instantiates providers concurrently, so this killed the first Postgres boot. The fix is
  ordering, not retries: `migrate()` takes `pg_advisory_xact_lock` **before** creating its
  own bookkeeping table. There is a test that races two migrations on a clean schema.
- **Don't reintroduce** `vinext`, `@cloudflare/vite-plugin`, `wrangler`, or
  `@openai/sites-vite-plugin`. Removing them is the whole point of ADR 0001.
- **A deleted static asset keeps being served.** Render's static deploy adds the new
  `out/` without pruning what left it — `/og.png` was still answering 200 with the old
  image after the deploy that deleted it, past a cache-buster. Deleting a file from
  `public/` removes it from the *site*, not from the *host*.
- **`npm run dev --workspaces` runs workspaces sequentially**, so a watcher in the first
  one starves every workspace after it — that is how `npm run dev` came to start the API
  and never the web server, with nothing on screen to say so. Fixed by `scripts/dev.mjs`;
  see the note above. Don't put the root `dev` script back to `--workspaces`, and treat
  `lint` / `typecheck` / `test` — which are still `--workspaces` — as the only safe use of
  it: they exit.

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
npm test                                                  # 3 tests; 14 more skip
STATIC_EXPORT=1 npm run build --workspace @discopod/web   # → apps/web/out/index.html
node apps/api/dist/main.js &                              # → curl localhost:3001/api/health
```

The storage tests need a Postgres, under `TEST_DATABASE_URL` — a *different* variable from
the app's `DATABASE_URL`, because they drop and recreate the `public` schema:

```bash
docker run -d --name discopod-pg -p 55432:5432 \
  -e POSTGRES_USER=discopod -e POSTGRES_PASSWORD=discopod -e POSTGRES_DB=discopod postgres:17
TEST_DATABASE_URL=postgres://discopod:discopod@127.0.0.1:55432/discopod npm test   # 17 tests
```

## Loose ends outside the repo

Cleared on 2026-09-04, once the repo was pushed and CI was green. The parent `work/` folder
held `_to_delete/` (empty by then), `_transfer/` (three tarballs used to move code between
machines), five `tuned-*.tar.gz` build artifacts — four loose plus `artifacts/tuned-v5.tar.gz` —
and `social-card/` and `learning-social-card/`, both byte-identical to files already committed
(`docs/social-preview-v1.png` and `apps/web/public/og.png` respectively, verified by sha256
— note that `og.png` has since been **deleted** from the repo, so the Trash copy and the git
history are now the only ones; see the share-image note above for why it went),
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
