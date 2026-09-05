# DiscoPod

**A podcast app for people who want to hear a language, not read a textbook.**

Mainstream podcast apps rank by charts, downloads and recency — signals that are useless
to a language learner, and often actively misleading. DiscoPod re-tunes every surface to
answer one question instead: **can I follow this with my ears?**

It serves two directions: **English speakers learning 繁體中文**, and **繁體中文 speakers
learning English**. Not three — a pair whose two sides are the same language teaches
nobody anything, so it is not published ([ADR 0012](docs/adr/0012-two-directions-and-en-to-en-is-not-one.md)).

Read [docs/VISION.md](docs/VISION.md) for the product thinking,
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the system is shaped — including an
honest table of what is built and what is not — and [HANDOFF.md](HANDOFF.md) for where the
work actually stands today.

**Live:** <https://discopod-web.onrender.com> — the discovery UI and player.
The API is separate at <https://discopod-api.onrender.com/api/health>; it runs on a free
instance, so the first request after 15 idle minutes waits out a cold start.

The site is a static export, and the browser never calls the API: the web app fetches the
catalogue from `@discopod/api` **at build time** and ships the ranking as HTML, so a
sleeping API can't slow down a visitor. See
[ADR 0002](docs/adr/0002-fetch-the-catalogue-at-build-time.md).

![DiscoPod](docs/social-preview-v1.png)

## Repo layout

```
apps/web    Next.js 16 · React 19 RSC — discovery UI and the transcript-first player
apps/api    NestJS 11 — catalogue, difficulty profiles, suitability ranking, saved words
docs/       vision, architecture, deployment, and the ADRs
```

npm workspaces; Node 22.13.0 (`nvm use`), with `engines` capped below 25 so an unbounded
range can't drift onto a newer major.

## Quick start

```bash
npm ci --include=dev  # a plain `npm ci` drops dev deps under NODE_ENV=production
npm run dev          # api on :3001, then web on :3000 once the API answers
                     # npm run dev:api / dev:web to run one side alone
```

```bash
npm run build        # builds both workspaces
npm run typecheck
npm run lint
npm test             # the Postgres integration suite skips without TEST_DATABASE_URL
```

Copy `apps/web/.env.example` and `apps/api/.env.example` to `.env` in each app before
running against anything other than localhost.

## What works today

- **Discovery ranked by followability.** Episodes carry a difficulty profile — speech
  rate, vocabulary coverage, speaker count, slang and accent load — and a suitability
  score computed against the learner's level.
- **A "start here" pick with its reasoning stated.** `GET /api/episodes/start-here?level=Beginner`
  returns an episode *and* a sentence explaining why it is the right one. The API cannot
  return a recommendation without a reason; it is part of the response type.
- **Both directions, derived rather than configured.** `GET /api/pairs` returns what the
  catalogue can actually serve, so a pair exists because there is an episode behind it.
- **A missing translation is an exclusion, never a fallback to English.** Explanatory text
  is keyed by the learner's language; an episode with no layer in yours is not in your
  catalogue, rather than served half-translated
  ([ADR 0003](docs/adr/0003-model-the-learner-language-pair.md)).
- **Transcript-first episode pages** with synced cues, vocabulary and comprehension
  questions.
- **Nine real episodes, and nothing invented.** Six English, three Mandarin, every one of
  them somebody else's audio with a published text behind the transcript, so sync is
  demonstrable rather than mocked. See Content credits below.
- **Saved words that keep their audio context** — sentence, speaker and timestamp travel
  with the word, so review can prompt recall by ear.
- **Optional Postgres.** With `DATABASE_URL` unset everything runs in memory, which is what
  CI and the static build use. Set it and the schema migrates on boot, the seed catalogue is
  published into it, and saved words become rows that survive a restart. It is never a
  fallback: an unreachable database fails the boot instead of quietly degrading to memory,
  and `/api/health` reports which mode is live
  ([ADR 0011](docs/adr/0011-postgres-is-a-publication-of-the-seed.md)).

## What is deliberately not built

RSS ingestion, the transcription and translation pipeline, learner auth, and the
completion-by-level ranking signal — which needs listening data that does not exist yet,
and is left absent rather than approximated. See the state table in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-domain-and-where-it-lives).

The catalogue is small for the same reason: an episode ships only once its audio, its
licence and its published text are all in hand. Freely-licensed Mandarin *programmes* are
the scarce thing — not freely-licensed Mandarin audio — so all three Mandarin episodes are
volunteer readings of Wikipedia articles, which is a compromise the ADRs record rather than
hide.

## Deploying and demoing

The whole web app still prerenders, so the fastest public demo is a static export that
can go on any file host:

```bash
STATIC_EXPORT=1 npm run build --workspace @discopod/web   # → apps/web/out/
```

Both services above run on Render from `render.yaml` in the repo root, so a push to
`main` deploys. Full options — managed hosts, Docker Compose, Postgres, and what has
actually been verified — are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Content credits

The catalogue is nine episodes. Every one is somebody else's recording, and the terms, the
source revision and every modification are recorded next to the files in
[`apps/web/public/audio/ATTRIBUTION.md`](apps/web/public/audio/ATTRIBUTION.md):

- **Let's Learn English, Lessons 1, 2, 4, 5, 6 and 10** —
  [VOA Learning English](https://learningenglish.voanews.com/z/3608), a work of the U.S.
  federal government and in the public domain in the United States. Shipped byte-for-byte
  unmodified; only the timed transcripts were added here, from VOA's own published dialogue.
- **海山漁港（條目導言）**, **鄧福如（條目導言）** and **吳宗憲（音樂家）－生平** — excerpts of
  volunteer readings of Chinese Wikipedia articles, [CC BY-SA
  4.0](https://creativecommons.org/licenses/by-sa/4.0/). Excerpted, transcoded and
  loudness-normalised here, and given the timed transcript nobody published for them: the
  characters come from the article revision that was read, the timings from ASR, never the
  other way round ([ADR 0010](docs/adr/0010-the-chinese-discopod-teaches-is-traditional.md)).

Nothing else is in it. Six further episodes were removed in
[ADR 0004](docs/adr/0004-measure-speech-rate-in-a-declared-unit.md): they carried invented
titles and invented transcripts under the names of real publishers, which is fabricated
attribution rather than sample data.

## License

MIT — see [LICENSE](LICENSE).
