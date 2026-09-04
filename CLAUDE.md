# DiscoPod

A podcast app for language learners, ranked by whether a learner can follow an episode by
ear rather than by charts, downloads or recency.

**Read [HANDOFF.md](HANDOFF.md) first** — current state, next steps, and the traps already
paid for. Then [docs/VISION.md](docs/VISION.md) for the product and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system.

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
- Every ranked result must carry its `reason`. Never fabricate the completion ranking signal.
- The catalogue's single source is `apps/api/src/catalog/data/catalog.seed.json`. The web app
  fetches it from the API during `next build` (`apps/web/scripts/build.mjs`) — don't
  reintroduce a catalogue module in `apps/web`, and don't make the browser call the API
  without revisiting ADR 0002.
- Architectural changes get an ADR in `docs/adr/`.
