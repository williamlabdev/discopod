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

- web: `NEXT_PUBLIC_SITE_URL`, and optionally `CATALOG_API_URL`
- api: `PORT`, `WEB_ORIGIN` (CORS origin — set it to the web app's URL), and optionally
  `DATABASE_URL` — see "Postgres, and when you need it" below

`CATALOG_API_URL` is a build-time override, not a runtime setting: leave it unset and the
web build starts its own API from the workspace to fetch the catalogue from. Set it only
to build against an API you already have running. The browser never calls the API, so
there is no public API URL to configure.

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

The values Render prompts for on first creation:

```
NEXT_PUBLIC_SITE_URL   https://discopod-web.onrender.com
WEB_ORIGIN             https://discopod-web.onrender.com     # the API's CORS origin
```

The web service's `buildFilter` includes `apps/api/**` as well as `apps/web/**`, because
the catalogue is baked in at build time — a seed or ranking change has to rebuild the
site, or the deployed pages would keep serving the old ranking.

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

**Use npm 11, not the npm bundled with Node 22.13.0.** Regenerating with npm 10.9.2 —
which is what `nvm use` gives you here — silently dropped 54 `"libc": ["glibc"]` fields
from the lockfile (a 154/165 diff where the change itself was 154/3). Those fields are how
npm decides whether a musl or glibc binary applies, so losing them is the same class of
breakage this section exists to prevent, arriving from the tool meant to prevent it. Run:

```bash
npx -y npm@11 install --package-lock-only --include=dev
```

Then check the diff for `libc` removals before committing. Found and fixed 2026-09-05.

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
and the same install flags as Render, then lints, typechecks, runs the tests, builds both
workspaces, verifies the static export produced `index.html`, and boots the API twice to
hit `/api/health` — once with no database and once against a `postgres:17` service
container, asserting `"storage":"postgres"`. A green CI run means the Render build works;
a red one tells you before Render does.

### Free-tier limits that will bite a demo

- **A free web service sleeps after 15 minutes of no traffic and takes about a minute to
  wake.** Whoever opens your link cold waits through that. The static site does not
  sleep, which is a real reason to keep the demo front end static until the UI needs the
  API.
- 750 free instance hours per month, per workspace.
- Free Postgres expires 30 days after creation (14-day grace period before deletion) —
  it cannot be the datastore for a long-lived demo.

Verified against Render's blueprint spec and free-tier docs, then deployed on
2026-09-04 — both services built clean from the Blueprint on the first attempt, and the
docs-only commit that followed rebuilt neither, which is `buildFilter` doing its job.

## Postgres, and when you need it

The API runs with no database. Leave `DATABASE_URL` unset and the catalogue is read from
the seed JSON and saved words live in memory — which is what the web build, CI and a
laptop run do, and it is fine for a demo where nobody saves a word they expect to keep.

Set `DATABASE_URL` and the API migrates its schema on boot, publishes the seed catalogue
into it, and stores saved words as rows. It is not a fallback: if the URL is set and the
database is unreachable, **the boot fails**, deliberately — see
[ADR 0011](adr/0011-postgres-is-a-publication-of-the-seed.md). Check which mode you got:

```bash
curl -fsS localhost:3001/api/health     # → {"status":"ok",…,"storage":"postgres"}
```

TLS is the connection string's business: append `?sslmode=require` for a managed Postgres.

Locally, `compose.yaml` has a `postgres:17` service the api service already points at, or
run one directly:

```bash
docker run -d --name discopod-pg -p 55432:5432 \
  -e POSTGRES_USER=discopod -e POSTGRES_PASSWORD=discopod -e POSTGRES_DB=discopod postgres:17
DATABASE_URL=postgres://discopod:discopod@127.0.0.1:55432/discopod npm run dev
```

The integration tests need one too, under a different variable so no test can ever point
itself at a real database by inheriting the app's:

```bash
TEST_DATABASE_URL=postgres://discopod:discopod@127.0.0.1:55432/discopod_test npm test
```

They **drop and recreate the `public` schema**. Point them at a throwaway database. With
`TEST_DATABASE_URL` unset they skip, and `npm test` still passes.

### On Render — not wired up, on purpose

`render.yaml` does **not** declare a database. Adding one to a Blueprint provisions a real
Postgres on a real account the moment it merges, and that is an owner's decision, not a
side effect of a pull request. Free Postgres also expires 30 days after creation, so it
cannot back a long-lived demo (see the free-tier limits above).

When it is wanted, it is these two additions:

```yaml
databases:
  - name: discopod-db
    plan: free
    databaseName: discopod
    user: discopod

services:
  - type: web
    name: discopod-api
    # … existing config …
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: discopod-db
          property: connectionString
```

Render's `connectionString` already carries `sslmode`, so nothing else changes. The web
service must **not** get `DATABASE_URL`: it builds a static export by booting the API
itself, and giving that build a database would make a deploy depend on one.

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

Verified in production on Render: both builds, `/api/health`, `start-here` returning a
stated reason, and the CORS header matching `WEB_ORIGIN`.

Verified against a local `postgres:17` container on 2026-09-05: schema migration, seed
publication and its no-op on the second boot, a saved word surviving a restart, and a boot
with an unreachable `DATABASE_URL` exiting 1 without ever listening. 17 tests, of which 14
need the database.

Not verified: the Dockerfiles — including the new `postgres` service in `compose.yaml`,
which has never been `docker compose up`-ed. Render's build pipeline is exercised; no
other provider's is, and no Postgres has ever run on Render for this app.
