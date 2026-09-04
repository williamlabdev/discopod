# Deploying and demoing DiscoPod

Nothing here is vendor-specific. Pick the row that matches what you need today.

| Goal | What to run | Where it can go |
| --- | --- | --- |
| Show someone the UI, now | `STATIC_EXPORT=1 npm run build -w @discopod/web` → `apps/web/out/` | Any static host: GitHub Pages, Netlify, S3, nginx |
| Full app with the API | `npm run build` → `next start` + `node dist/main.js` | Any Node host, or the compose file below |
| Local walkthrough | `npm run dev` | localhost:3000 (web) + localhost:3001 (api) |

## Option 1 — static demo (fastest public link)

Every route in the web app currently prerenders, so it exports to plain HTML with no
server at all. Verified: the export produces a complete 4 MB `out/` directory.

```bash
npm install
STATIC_EXPORT=1 npm run build --workspace @discopod/web
# → apps/web/out/  — upload this anywhere
```

For GitHub Pages, push `out/` to a `gh-pages` branch or point a Pages workflow at it;
the site is public with no login, which is the problem this replaces. Set
`NEXT_PUBLIC_SITE_URL` to the final URL before building so Open Graph images resolve.

This mode has no backend. It is the right demo until the UI actually calls the API.

## Option 2 — web + API on two managed hosts

```bash
npm run build                       # builds both workspaces
npm run start --workspace @discopod/web   # next start, port 3000
npm run start --workspace @discopod/api   # node dist/main.js, port 3001
```

Both are ordinary Node processes, so any of Vercel / Netlify / Render / Railway / Fly /
a plain VPS will run them. The only wiring is environment variables:

- web: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`
- api: `PORT`, `WEB_ORIGIN` (CORS origin — set it to the web app's URL)

Note the split: if the web app goes to Vercel, the NestJS service does **not** — put it
on a host that runs a long-lived Node process. Keeping them independently deployable is
the point of the two-container shape.

## Option 3 — one host, Docker Compose

`compose.yaml` plus a Dockerfile per app are in the repo:

```bash
docker compose up --build
```

⚠️ These Dockerfiles have not been built and run yet — there was no Docker daemon in the
environment where the rest of this was verified. Treat the first `docker compose up` as
a real test, not a formality.

## Option 2a — Render, from `render.yaml`

`render.yaml` in the repo root defines both services as a Render Blueprint, so the
setup is: connect the repo once in the Render dashboard (**New → Blueprint**), fill in
the three prompted URLs, and every later `git push` deploys.

| Service | Type | Notes |
| --- | --- | --- |
| `discopod-web` | `runtime: static` | Static export, served from Render's CDN. Never sleeps. |
| `discopod-api` | `runtime: node`, `plan: free` | Long-lived Node process. Health check at `/api/health`. |

Both build from the repo root — this is an npm workspaces monorepo, so `npm ci` needs
the root lockfile and `rootDir` is deliberately unset. `buildFilter` is what stops a
web-only commit from rebuilding the API.

The three values Render prompts for on first creation:

```
NEXT_PUBLIC_SITE_URL   https://discopod-web.onrender.com
NEXT_PUBLIC_API_URL    https://discopod-api.onrender.com/api
WEB_ORIGIN             https://discopod-web.onrender.com     # the API's CORS origin
```

No API key is needed for any of this — Render deploys from GitHub. A Render API key is
only for driving Render's own API from outside, which this setup does not do.

### Regenerating the lockfile

Always regenerate with:

```bash
npm install --package-lock-only --include=dev
```

Never commit a lockfile produced by a plain `npm install`. A plain install records
only the optional native packages for the machine that ran it, so `npm ci` on a
different OS or CPU then fails with *"Cannot find native binding"*
([npm/cli#4828](https://github.com/npm/cli/issues/4828)) — oxlint, oxfmt, Next.js's
Turbopack and unrs-resolver all ship platform-specific binaries. `--package-lock-only`
resolves the whole graph instead, so one lockfile serves macOS, Linux CI and Render.
This was reproduced both ways and verified.

### The devDependencies trap

Both build commands use `npm ci --include=dev`, not `npm ci`. If `NODE_ENV` is
`production` — which is normal on a deploy host — npm omits devDependencies, and the
builds fail on missing tooling: `@tailwindcss/postcss` for the web app, `@nestjs/cli`
for the API. This was reproduced in a clean checkout, then fixed and re-verified.

If you ever simplify those commands, keep the flag.

### Node version

Render's current default is Node 24.x. This repo pins 22.13.0 three ways —
`NODE_VERSION` in `render.yaml`, `.nvmrc`, and an `engines` range with an upper bound
(`>=22.13.0 <25`), so an unbounded range can't drift onto a newer major.

### CI mirrors the deploy

`.github/workflows/ci.yml` runs the same Node version, the same `NODE_ENV=production`,
and the same install flags as Render, then lints, typechecks, builds both workspaces,
verifies the static export produced `index.html`, and boots the API to hit
`/api/health`. A green CI run means the Render build works; a red one tells you before
Render does.

### Free-tier limits that will bite a demo

- **A free web service sleeps after 15 minutes of no traffic and takes about a minute to
  wake.** Whoever opens your link cold waits through that. The static site does not
  sleep, which is a real reason to keep the demo front end static until the UI needs the
  API.
- 750 free instance hours per month, per workspace.
- Free Postgres expires 30 days after creation (14-day grace period before deletion) —
  it cannot be the datastore for a long-lived demo.

Verified against Render's blueprint spec and free-tier docs; the Blueprint itself has
not been deployed yet.

## Demo checklist

1. `npm install && npm run build` — both workspaces must build clean.
2. `curl localhost:3001/api/health` → `{"status":"ok",...}`
3. `curl "localhost:3001/api/episodes/start-here?level=Beginner"` → an episode with a
   stated reason. This is the vision's "state the reason" principle, observable from
   the command line.
4. Open the web app, play Lesson 1 — it is the one episode with real publisher audio
   and a synced transcript, so it is what to demo.

## What is verified, and what is not

Verified in a clean container: `npm install` on both workspaces, `next build` (Node and
static-export modes), `nest build`, and the API answering `/health`, `/shows`,
`/episodes`, `/episodes/start-here`, `/episodes/:id/transcript`, `POST /me/words`,
plus 400 on an invalid payload and 404 on a missing episode.

Not verified: the Dockerfiles, and any hosting provider's own build pipeline.
