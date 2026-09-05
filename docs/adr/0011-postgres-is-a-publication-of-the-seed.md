# ADR 0011 — Postgres stores saved words and publishes the seed catalogue

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Builds on:** [ADR 0002](0002-fetch-the-catalogue-at-build-time.md), which is why the
  catalogue can live in a database without the browser ever learning that it does.
- **Does not touch:** [ADR 0003](0003-model-the-learner-language-pair.md). Nothing here
  changes what a pair is or how `Localized` is unwrapped; the values go into `jsonb` and
  come back the same shape.

## Context

Two things in this app are stored, and they are not the same kind of thing.

The catalogue is authored. Its single source is
`apps/api/src/catalog/data/catalog.seed.json` plus its overlays, it is read at boot by
`loadSeedCatalog()`, and it is baked into the web app at build time. Losing it costs
nothing: it is in git.

Saved words are not authored, and they are not in git. A learner saves a word from the
player with the sentence, the speaker and the timestamp around it; that is the one thing
in DiscoPod that cannot be regenerated from anything. Until now it lived in a `Map` inside
`VocabularyService`, which means every restart of the API silently threw away everything
anyone had saved. The comment in `saved-word.types.ts` already said so.

So the pressure to add a database comes entirely from the second one. The catalogue is
here because once there *is* a database, serving the catalogue out of the seed JSON in one
process and out of Postgres in another is two code paths for one question, and the one
that gets exercised least is the one that breaks.

## Decision

### 1. `pg`, raw SQL, no ORM

`pg` (node-postgres) and hand-written SQL. Not TypeORM, not Prisma, not Drizzle.

The schema is two catalogue tables and one saved-words table, and the queries are
`select … order by position` and one insert. An ORM's value is in the queries nobody wants
to write by hand, and there are none of those here; what it would cost is a second schema
language, a migration runner with its own opinions, and — in Prisma's case — a
platform-specific engine binary, which is exactly the lockfile trap this repo has already
paid for once (see `docs/DEPLOYMENT.md`, "Regenerating the lockfile"). `pg` is pure JS.

TLS is the connection string's business. `sslmode=require` in `DATABASE_URL` is the whole
configuration; there is no ssl option in the code to disagree with it.

### 2. `DATABASE_URL` selects the adapter, and it is never a fallback

Unset: the in-memory adapters. That is the web build, CI's first smoke test, and the
default laptop run — and it is a deliberate mode, not a degraded one, because
`apps/web/scripts/build.mjs` boots the API during `next build` and a build must not
require a database.

Set: the Postgres adapters, and if the database cannot be reached **the boot fails**. It
does not fall back to memory. A service that answers `/api/health` with `"status":"ok"`
while quietly discarding every word a learner saves is worse than a service that is down,
because nobody finds out. `/api/health` reports `storage: 'postgres' | 'memory'` so the
mode is observable, and CI asserts the string.

The health check deliberately does not probe the connection. It is what `build.mjs` and
`scripts/dev.mjs` wait on to decide the API is up, and it is what Render probes; a
readiness check that queries the database on every poll is a different endpoint's job.

### 3. Postgres is a *publication* of the seed, not a second source of it

The seed JSON stays the single source. On boot the Postgres catalogue adapter hashes
`JSON.stringify(loadSeedCatalog())`, compares it with the digest in `catalog_publication`,
and if they differ it replaces the catalogue wholesale and stores the new digest.

This is what keeps CLAUDE.md's "the catalogue's single source is `catalog.seed.json`" true
after adding a database. Editing a row in Postgres is not a way to change the catalogue;
the next boot overwrites it. The digest is a change detector, not a content address — it
is over the loaded object rather than the file bytes, so an overlay change or a loader
change republishes too, which is the behaviour that matters.

### 4. The catalogue is `jsonb` documents; saved words are real columns

An `Episode` is a nested document with `Localized` values, a transcript, vocabulary and
questions, and *nothing queries inside it* — every read is by id, by show, or the whole
list. Shredding that into eight tables would buy joins nobody performs and would give the
`Localized` invariant eight new places to be violated. So `catalog_shows` and
`catalog_episodes` are `(id, position, document jsonb)`, and the document is the exact
object `loadSeedCatalog()` produced.

`position` is a column because `sort=recent` returns repository order — the seed has no
publication dates — so the order rows come back in is part of the API's contract, and
`select` without `order by` does not have one. Every read orders by it.

Saved words are the opposite: a small flat record, written one row at a time, read by
learner, and destined for a review scheduler that will want to query by date and by pair.
Those are columns.

### 5. Migrations run in-process, under an advisory lock, with the SQL in TypeScript

`MIGRATIONS` is an ordered list of `{ id, sql }` applied inside one transaction that takes
`pg_advisory_xact_lock(SCHEMA_LOCK)` **before it creates the bookkeeping table**. That
ordering is the whole point: `create table if not exists` is not atomic against a
concurrent create. `CatalogModule` and `VocabularyModule` both migrate, Nest instantiates
providers concurrently, and the first Postgres boot of this app died on
`duplicate key value violates unique constraint "pg_type_typname_nsp_index"`. The race is
now a test.

The SQL is embedded in TypeScript rather than kept in `.sql` files because `nest-cli.json`
copies only `**/data/*.json` into `dist`. A `.sql` file would work in dev and be missing in
production — the same trap CLAUDE.md already records for data files, arriving through a
different door.

### 6. The tests use a real Postgres, or they skip

`apps/api/src/db/postgres.spec.ts` runs against `TEST_DATABASE_URL` and skips when it is
unset. Mocking `pg` would test that these files call the functions they visibly call;
every defect this suite exists for — the migration race, ordering, `jsonb` round-tripping,
a null `speaker` coming back as the string "null" — is the database's behaviour, not ours.
CI supplies a `postgres:17` service container so the skip cannot go unnoticed, and boots
the built API against it as a second smoke test.

## What this does not do

- **No connection to Render.** `render.yaml` is unchanged: merging a Blueprint change that
  declares a database provisions a real one on a real account, and that is William's call
  to make, not a side effect of a pull request. `docs/DEPLOYMENT.md` carries the snippet
  and the free-tier expiry that makes it a bad idea for a long-lived demo.
- **No auth.** `learnerId` still comes from a header. Saved words are now durable *and*
  unauthenticated, which is a smaller gap than it sounds only because there is no login to
  attach them to yet.
- **No ingestion.** Nothing writes to the catalogue tables except publication.

## Consequences we accept

- **Every catalogue read is a full-table read of `jsonb`.** The port has no query
  pushdown: `findEpisodes()` returns everything and the service filters and ranks in
  memory, exactly as the in-memory adapter does. That is correct at one show and two
  episodes and wrong at a thousand; the fix is filtering in the port's signature, and it is
  deferred, not overlooked.
- **Two adapters mean two behaviours to keep identical.** The in-memory one is not dead
  code kept for tests — it is what the build runs. The properties they must share (a
  learner sees only their own words, oldest first) are asserted against both.
- **A boot that republishes is a boot that briefly has no catalogue.** Publication deletes
  and reinserts inside one transaction, so a reader sees the old catalogue or the new one,
  never half — but two API instances deploying at once will both try, and the advisory lock
  serialises them into one republishing and one finding nothing to do.
- **The digest makes the seed win, always.** If anyone ever does need to edit catalogue
  content in the database — a correction that cannot wait for a deploy — this design
  actively fights them, and the honest answer is that the correction belongs in the seed.
