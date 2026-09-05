import { createHash } from 'node:crypto';

import type { PoolClient } from 'pg';

import { CatalogRepository } from './catalog.repository';
import { loadSeedCatalog } from './catalog.seed';
import type { Episode, Show } from './catalog.types';
import type { Database } from '../db/database';
import { migrate, SCHEMA_LOCK } from '../db/migrations';

/**
 * The catalogue, served from Postgres and published there from the seed.
 *
 * The seed JSON stays the single source (CLAUDE.md, ADR 0002). These tables
 * are a *publication* of it, not a second place to author episodes: on boot
 * the loaded catalogue is hashed, and if the hash differs from the one on
 * record the tables are replaced in one transaction. So a seed edit reaches a
 * deployed API by deploying, exactly as it did when the catalogue lived in
 * process memory.
 *
 * What that buys today is small and worth saying plainly: the same rows the
 * process could have held anyway, plus a schema. What it buys next is the
 * point — ingestion has to write episodes somewhere that is not a file in git,
 * and saved words need a store that survives a restart. See ADR 0011.
 */
export class PostgresCatalogRepository extends CatalogRepository {
  constructor(private readonly db: Database) {
    super();
  }

  /**
   * Migrate, then publish the seed if it has changed. Awaited during
   * bootstrap by the provider in `catalog.module.ts`, so the API never answers
   * a request before its catalogue is in place.
   */
  async initialise(): Promise<{ migrations: string[]; published: boolean }> {
    const migrations = await migrate(this.db);
    const published = await this.publishSeed();
    return { migrations, published };
  }

  async findShows(): Promise<Show[]> {
    const rows = await this.db.query<{ document: Show }>(
      'select document from catalog_shows order by position',
    );
    return rows.map((row) => row.document);
  }

  async findShow(id: string): Promise<Show | null> {
    const rows = await this.db.query<{ document: Show }>(
      'select document from catalog_shows where id = $1',
      [id],
    );
    return rows[0]?.document ?? null;
  }

  async findEpisodes(): Promise<Episode[]> {
    const rows = await this.db.query<{ document: Episode }>(
      'select document from catalog_episodes order by position',
    );
    return rows.map((row) => row.document);
  }

  async findEpisode(id: string): Promise<Episode | null> {
    const rows = await this.db.query<{ document: Episode }>(
      'select document from catalog_episodes where id = $1',
      [id],
    );
    return rows[0]?.document ?? null;
  }

  async findEpisodesByShow(showId: string): Promise<Episode[]> {
    const rows = await this.db.query<{ document: Episode }>(
      'select document from catalog_episodes where show_id = $1 order by position',
      [showId],
    );
    return rows.map((row) => row.document);
  }

  /** True when this boot replaced the published catalogue. */
  private async publishSeed(): Promise<boolean> {
    const catalog = loadSeedCatalog();
    const digest = digestOf(catalog);

    return this.db.transaction(async (client) => {
      // The same lock the migrations take. Two instances booting on the same
      // deploy would otherwise both delete and both insert, and the loser
      // rolls back on a primary key that existed for a moment.
      await client.query('select pg_advisory_xact_lock($1)', [SCHEMA_LOCK]);

      const { rows } = await client.query<{ seed_digest: string }>(
        'select seed_digest from catalog_publication where only_row',
      );
      if (rows[0]?.seed_digest === digest) return false;

      await replaceCatalog(client, catalog);
      await client.query(
        `insert into catalog_publication (only_row, seed_digest, published_at)
         values (true, $1, now())
         on conflict (only_row) do update set seed_digest = excluded.seed_digest,
                                              published_at = excluded.published_at`,
        [digest],
      );
      return true;
    });
  }
}


/**
 * A change detector, not a content address.
 *
 * `loadSeedCatalog` builds every object with the same keys in the same order
 * from the same files, so `JSON.stringify` over its result is stable within a
 * build — which is all this has to be. It is compared against itself, never
 * published, and never used to decide that two catalogues are *the same*.
 * A key order change in the loader republishes once, harmlessly.
 */
function digestOf(catalog: { shows: Show[]; episodes: Episode[] }): string {
  return createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
}

/**
 * Replace, rather than reconcile row by row. The seed is the whole catalogue,
 * so anything in these tables that is not in it is something the seed deleted
 * — and a diff that decided otherwise would keep serving a removed episode.
 * ADR 0004 removed six; ADR 0010 removed a seventh.
 */
async function replaceCatalog(
  client: PoolClient,
  catalog: { shows: Show[]; episodes: Episode[] },
): Promise<void> {
  // Episodes reference shows, so they go first; the cascade would handle it,
  // but relying on a cascade to order your own writes hides the dependency.
  await client.query('delete from catalog_episodes');
  await client.query('delete from catalog_shows');

  for (const [position, show] of catalog.shows.entries()) {
    await client.query(
      'insert into catalog_shows (id, position, document) values ($1, $2, $3)',
      [show.id, position, JSON.stringify(show)],
    );
  }

  for (const [position, episode] of catalog.episodes.entries()) {
    await client.query(
      'insert into catalog_episodes (id, show_id, position, document) values ($1, $2, $3, $4)',
      [episode.id, episode.showId, position, JSON.stringify(episode)],
    );
  }
}
