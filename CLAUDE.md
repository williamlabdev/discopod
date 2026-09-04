# DiscoPod

A podcast app for language learners, ranked by whether a learner can follow an episode by
ear rather than by charts, downloads or recency.

**Read [HANDOFF.md](HANDOFF.md) first** — current state, next steps, and the traps already
paid for. Then [docs/VISION.md](docs/VISION.md) for the product,
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system, and
[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for numbered requirements not yet built.

## Layout

- `apps/web` — Next.js 16, React 19 RSC. Discovery UI and the transcript-first player.
- `apps/api` — NestJS 11. Catalogue, difficulty profiles, suitability ranking, saved words.
- npm workspaces; Node 22.13.0 (`nvm use`).

## Commands

```bash
npm ci --include=dev     # never a plain `npm ci` — NODE_ENV=production drops dev deps
npm run dev              # web :3000, api :3001
npm run lint && npm run typecheck && npm run build
```

## Rules

- Regenerate the lockfile only with `npm install --package-lock-only --include=dev`.
  A plain `npm install` produces a lockfile that breaks `npm ci` on other platforms.
- Do not reintroduce `vinext`, `@cloudflare/vite-plugin`, `wrangler` or
  `@openai/sites-vite-plugin` — removing the vendor coupling is the point of ADR 0001.
- Do not switch Geist back to `next/font/google`; it needs build-time network egress.
- `apps/web/components/ui/**` is vendored shadcn output, excluded from lint. Don't hand-edit.
- `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` are written by `next dev`, not by hand.
  Don't edit them — they get rewritten. They are committed so that a `next` upgrade
  changing what they instruct agents to do shows up in a diff instead of arriving
  silently. Read that diff; don't wave it through.
- Every ranked result must carry its `reason`. Never fabricate the completion ranking signal.
- Learner-language text (`profile.reason`, `learningGoal`, `vocabulary[].meaning`, question
  `prompt`/`options`, cue `translation`) is `Localized` — keyed by the learner's language.
  Show-language text (titles, `term`, `example`, cue `text`) stays scalar. Unwrap only through
  `pick()` (web) or `requireLanguage()` (api): **a missing key is an exclusion, never a fallback
  to English.** The catalogue is declared `en → en` (`SEED_PAIR`, `ACTIVE_PAIR`). See ADR 0003.
- The catalogue's single source is `apps/api/src/catalog/data/catalog.seed.json`. The web app
  fetches it from the API during `next build` (`apps/web/scripts/build.mjs`) — don't
  reintroduce a catalogue module in `apps/web`, and don't make the browser call the API
  without revisiting ADR 0002.
- `apps/api/src/ingest/data/sources.seed.json` is a list of shows to ingest *from*, not a
  catalogue, and nothing reads it yet. It is not a second catalogue source and its
  `easy`/`intermediate`/`hard` values are not `DifficultyProfile.level`. See
  `apps/api/src/ingest/README.md` before using it.
- JSON under `apps/api/src/**/data/` reaches `dist` only via the `assets` glob in
  `nest-cli.json`. Put data files in a `data/` directory or the build drops them, and
  runtime `readFileSync` works in dev and fails in production.
- Architectural changes get an ADR in `docs/adr/`.
