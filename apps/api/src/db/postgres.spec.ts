import { randomUUID } from 'node:crypto';

import { loadSeedCatalog } from '../catalog/catalog.seed';
import { PostgresCatalogRepository } from '../catalog/postgres-catalog.repository';
import type { SavedWord } from '../vocabulary/saved-word.types';
import { PostgresVocabularyRepository } from '../vocabulary/postgres-vocabulary.repository';
import { Database } from './database';
import { migrate } from './migrations';

/**
 * The Postgres adapters, against a real Postgres.
 *
 * Gated on `TEST_DATABASE_URL` rather than mocked. A mock of `pg` would test
 * that these files call the functions this file says they call, which is the
 * one thing that was never in doubt; every defect this suite exists for —
 * the `create table if not exists` race, ordering, `jsonb` round-tripping,
 * a null `speaker` — lives in the database's behaviour, not in ours. With no
 * URL set the suite skips, which is what `npm test` does on a laptop with no
 * container running, and CI sets it from a service container.
 *
 * **This drops and recreates `public`.** Point it at a throwaway database.
 *
 * One file, deliberately: jest runs files in parallel workers and this suite
 * owns the whole schema, so two Postgres spec files would race each other for
 * it. Cases inside a file run in order, which is what the migration cases
 * below rely on.
 */
const url = process.env.TEST_DATABASE_URL;
const describeIfPostgres = url ? describe : describe.skip;

const MIGRATION_ID = '0001-catalogue-and-saved-words';

const word = (overrides: Partial<SavedWord>): SavedWord => ({
  id: randomUUID(),
  learnerId: 'ana',
  speaks: 'en',
  learning: 'zh-Hant',
  term: '漁港',
  meaning: 'fishing harbour',
  sentence: '海山漁港位於新北市。',
  episodeId: '102',
  timestampMs: 12_000,
  savedAt: '2026-09-05T00:00:00.000Z',
  ...overrides,
});

describeIfPostgres('the Postgres adapters', () => {
  let db: Database;

  const emptySchema = async () => {
    await db.query('drop schema public cascade');
    await db.query('create schema public');
  };

  beforeAll(async () => {
    db = new Database(url as string);
    await emptySchema();
  });

  afterAll(async () => {
    await db?.close();
  });

  describe('migrations', () => {
    it('applies each migration once and is a no-op the second time', async () => {
      await expect(migrate(db)).resolves.toEqual([MIGRATION_ID]);
      await expect(migrate(db)).resolves.toEqual([]);
    });

    // The regression this is here for: `CatalogModule` and `VocabularyModule`
    // both migrate, Nest instantiates providers concurrently, and `create
    // table if not exists` is not atomic against a concurrent create — two
    // callers reaching it together failed on a duplicate key in `pg_type`.
    // The advisory lock is taken before the bookkeeping table exists, which
    // is the only ordering that makes this pass.
    it('survives two callers migrating a clean schema at once', async () => {
      await emptySchema();

      const [first, second] = await Promise.all([migrate(db), migrate(db)]);

      expect([...first, ...second]).toEqual([MIGRATION_ID]);
    });
  });

  describe('the catalogue', () => {
    const seed = loadSeedCatalog();

    beforeAll(async () => {
      await emptySchema();
    });

    it('publishes the seed once, then recognises it as unchanged', async () => {
      await expect(new PostgresCatalogRepository(db).initialise()).resolves.toEqual({
        migrations: [MIGRATION_ID],
        published: true,
      });
      await expect(new PostgresCatalogRepository(db).initialise()).resolves.toEqual({
        migrations: [],
        published: false,
      });
    });

    it('returns shows and episodes in seed order', async () => {
      const repository = new PostgresCatalogRepository(db);

      expect((await repository.findShows()).map((show) => show.id)).toEqual(
        seed.shows.map((show) => show.id),
      );
      expect((await repository.findEpisodes()).map((episode) => episode.id)).toEqual(
        seed.episodes.map((episode) => episode.id),
      );
    });

    it('round-trips an episode whole, Localized values and all', async () => {
      const expected = seed.episodes[0];

      await expect(new PostgresCatalogRepository(db).findEpisode(expected.id)).resolves.toEqual(
        expected,
      );
    });

    it('round-trips a show whole', async () => {
      const expected = seed.shows[0];

      await expect(new PostgresCatalogRepository(db).findShow(expected.id)).resolves.toEqual(
        expected,
      );
    });

    it('answers null for an episode and a show that are not there', async () => {
      const repository = new PostgresCatalogRepository(db);

      await expect(repository.findEpisode('no-such-episode')).resolves.toBeNull();
      await expect(repository.findShow('no-such-show')).resolves.toBeNull();
    });

    it('finds a show its own episodes, in seed order', async () => {
      const showId = seed.episodes[0].showId;
      const expected = seed.episodes.filter((episode) => episode.showId === showId);

      await expect(new PostgresCatalogRepository(db).findEpisodesByShow(showId)).resolves.toEqual(
        expected,
      );
    });
  });

  describe('saved words', () => {
    beforeAll(async () => {
      await emptySchema();
      await new PostgresVocabularyRepository(db).initialise();
    });

    it('returns what it stored, unchanged', async () => {
      const repository = new PostgresVocabularyRepository(db);
      const saved = word({});

      await expect(repository.save(saved)).resolves.toEqual(saved);
      await expect(repository.list(saved.learnerId)).resolves.toContainEqual(saved);
    });

    it('keeps each learner to their own words', async () => {
      const repository = new PostgresVocabularyRepository(db);
      const mine = word({ learnerId: 'solo-a' });
      await repository.save(mine);
      await repository.save(word({ learnerId: 'solo-b' }));

      await expect(repository.list('solo-a')).resolves.toEqual([mine]);
    });

    it('lists a learner in the order they saved, oldest first', async () => {
      const repository = new PostgresVocabularyRepository(db);
      const earlier = word({ learnerId: 'ordered', savedAt: '2026-09-05T00:00:00.000Z' });
      const later = word({ learnerId: 'ordered', savedAt: '2026-09-05T01:00:00.000Z' });

      // Saved out of order, so the ordering can only come from the column.
      await repository.save(later);
      await repository.save(earlier);

      await expect(repository.list('ordered')).resolves.toEqual([earlier, later]);
    });

    // `speaker` is optional on SavedWord and null in the column. A row that
    // came back with `speaker: null` would typecheck as a string and render
    // as the word "null" over the transcript.
    it('omits an absent speaker instead of returning null', async () => {
      const repository = new PostgresVocabularyRepository(db);
      const anonymous = word({ learnerId: 'no-speaker' });

      const stored = await repository.save(anonymous);

      expect('speaker' in stored).toBe(false);
    });

    it('keeps a speaker when there is one', async () => {
      const repository = new PostgresVocabularyRepository(db);

      const stored = await repository.save(word({ learnerId: 'with-speaker', speaker: '主持人' }));

      expect(stored.speaker).toBe('主持人');
    });

    it('returns an unknown learner an empty list', async () => {
      await expect(new PostgresVocabularyRepository(db).list('nobody')).resolves.toEqual([]);
    });
  });
});
