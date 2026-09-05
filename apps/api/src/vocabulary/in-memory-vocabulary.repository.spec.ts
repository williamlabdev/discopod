import { InMemoryVocabularyRepository } from './in-memory-vocabulary.repository';
import type { SavedWord } from './saved-word.types';

const word = (overrides: Partial<SavedWord>): SavedWord => ({
  id: 'w1',
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

/**
 * The in-memory adapter is what runs with no `DATABASE_URL` — the build, CI,
 * and the default dev setup — so its behaviour is the one the Postgres
 * adapter has to match. These are the two properties both must hold:
 * a learner sees only their own words, in the order they saved them.
 */
describe('InMemoryVocabularyRepository', () => {
  it('keeps each learner to their own words', async () => {
    const repository = new InMemoryVocabularyRepository();
    await repository.save(word({ id: 'a', learnerId: 'ana' }));
    await repository.save(word({ id: 'b', learnerId: 'ben' }));

    expect((await repository.list('ana')).map((w) => w.id)).toEqual(['a']);
    expect((await repository.list('ben')).map((w) => w.id)).toEqual(['b']);
  });

  it('returns an unknown learner an empty list, not an error', async () => {
    const repository = new InMemoryVocabularyRepository();
    await expect(repository.list('nobody')).resolves.toEqual([]);
  });

  it('lists words in the order they were saved', async () => {
    const repository = new InMemoryVocabularyRepository();
    await repository.save(word({ id: 'first' }));
    await repository.save(word({ id: 'second' }));

    expect((await repository.list('ana')).map((w) => w.id)).toEqual(['first', 'second']);
  });
});
