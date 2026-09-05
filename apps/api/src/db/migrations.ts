import type { PoolClient } from 'pg';

import type { Database } from './database';

/**
 * Schema changes, in order, as SQL embedded in TypeScript.
 *
 * Deliberately not `.sql` files. `nest-cli.json` copies `**\/data/*.json` into
 * `dist` and nothing else, so a `.sql` file would work in dev — where the
 * source tree is what runs — and be missing in production, which is the exact
 * failure CLAUDE.md already warns about for data files. Widening the assets
 * glob would fix the copying and leave the same trap armed for whoever adds
 * the next file type. A string in a compiled module cannot be left behind.
 *
 * Applied migrations are recorded by id and never re-run. To change the
 * schema, add an entry; do not edit one that has shipped.
 */
export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: '0001-catalogue-and-saved-words',
    sql: `
      create table catalog_shows (
        id text primary key,
        -- Insertion order of the seed. 'sort=recent' returns the repository's
        -- own order (CatalogService), so order is part of the API's answer and
        -- an unordered select would quietly reshuffle the site on every deploy.
        position integer not null,
        document jsonb not null
      );

      create table catalog_episodes (
        id text primary key,
        show_id text not null references catalog_shows (id) on delete cascade,
        position integer not null,
        document jsonb not null
      );

      create index catalog_episodes_show_id_idx on catalog_episodes (show_id, position);

      -- One row, holding the digest of the seed the catalogue was published
      -- from. The primary key is a constant so a second row cannot exist.
      create table catalog_publication (
        only_row boolean primary key default true check (only_row),
        seed_digest text not null,
        published_at timestamptz not null default now()
      );

      -- Not jsonb. A saved word is the one thing here a learner owns and
      -- nothing can regenerate (saved-word.types.ts), so its fields are
      -- columns: they get types, constraints and an index, and a shape change
      -- has to be a migration rather than a quiet difference between two rows.
      create table saved_words (
        id uuid primary key,
        learner_id text not null,
        speaks text not null,
        learning text not null,
        term text not null,
        meaning text not null,
        sentence text not null,
        speaker text,
        episode_id text not null,
        timestamp_ms integer not null,
        saved_at timestamptz not null
      );

      create index saved_words_learner_idx on saved_words (learner_id, saved_at, id);
    `,
  },
];

/**
 * One advisory lock key for everything this app does to its own schema and
 * catalogue tables — migrations and the seed publication both take it.
 *
 * Two API instances booting together would otherwise both find the same
 * migration pending and both apply it; the second fails on a table that now
 * exists, and the deploy reads as a crash loop rather than as a race. Sharing
 * one key rather than taking two also means neither path can ever hold half
 * the pair: it is taken, used and released inside a single transaction.
 */
export const SCHEMA_LOCK = 8_675_309;

export async function migrate(db: Database): Promise<string[]> {
  return db.transaction(async (client: PoolClient) => {
    // The lock comes first, before even the bookkeeping table. `create table
    // if not exists` is not atomic against a concurrent create: two callers
    // reaching it together fail on a duplicate key in `pg_type`, not on the
    // table they were being careful about. Both repository factories call
    // `migrate`, and Nest instantiates providers concurrently, so this is the
    // ordinary path rather than a two-instance edge case — it failed on the
    // first boot that had both adapters bound.
    await client.query('select pg_advisory_xact_lock($1)', [SCHEMA_LOCK]);
    await client.query(`
      create table if not exists schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query<{ id: string }>('select id from schema_migrations');
    const applied = new Set(rows.map((row) => row.id));
    const ran: string[] = [];

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      await client.query(migration.sql);
      await client.query('insert into schema_migrations (id) values ($1)', [migration.id]);
      ran.push(migration.id);
    }

    return ran;
  });
}
