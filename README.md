# DiscoPod

**A podcast app for people who want to hear a language, not read a textbook.**

Mainstream podcast apps rank by charts, downloads and recency — signals that are useless
to a language learner, and often actively misleading. DiscoPod re-tunes every surface to
answer one question instead: **can I follow this with my ears?**

Read [docs/VISION.md](docs/VISION.md) for the product thinking, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the system is shaped — including an
honest table of what is built and what is not.

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
docs/       vision, architecture, ADRs
```

npm workspaces; Node >= 22.13.

## Quick start

```bash
npm install
npm run dev          # web on :3000, api on :3001
```

```bash
npm run build        # builds both workspaces
npm run typecheck
npm run lint
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
- **Transcript-first episode pages** with synced cues, vocabulary and comprehension
  questions.
- **One real lesson.** Lesson 1 uses the actual VOA *Let's Learn English* audio and its
  captions, so transcript sync is demonstrable rather than mocked.
- **Saved words that keep their audio context** — sentence, speaker and timestamp travel
  with the word, so review can prompt recall by ear.

## What is deliberately not built

RSS ingestion, the transcription and translation pipeline, learner auth, persistence
(the catalogue and saved words are in memory), and the completion-by-level ranking
signal — which needs listening data that does not exist yet, and is left absent rather
than approximated. See the state table in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-domain-and-where-it-lives).

## Deploying and demoing

The whole web app still prerenders, so the fastest public demo is a static export that
can go on any file host:

```bash
STATIC_EXPORT=1 npm run build --workspace @discopod/web   # → apps/web/out/
```

Both services above run on Render from `render.yaml` in the repo root, so a push to
`main` deploys. Full options — managed hosts, Docker Compose, and what has actually been
verified — are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Content credits

The Lesson 1 audio and transcript come from
[VOA Learning English — *Let's Learn English*, Lesson 1](https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html),
a U.S. government publication. Other catalogue entries are sample data.

## License

MIT — see [LICENSE](LICENSE).
