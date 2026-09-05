import type { LanguageTag } from '../catalog/language.types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import type { SavedWord } from './saved-word.types';
import { VocabularyRepository } from './vocabulary.repository';

interface SavedWordRow {
  id: string;
  learner_id: string;
  speaks: string;
  learning: string;
  term: string;
  meaning: string;
  sentence: string;
  speaker: string | null;
  episode_id: string;
  timestamp_ms: number;
  saved_at: Date;
}

export class PostgresVocabularyRepository extends VocabularyRepository {
  constructor(private readonly db: Database) {
    super();
  }

  /**
   * Migrates too, rather than trusting the catalogue repository to have gone
   * first. Both adapters need the same schema and Nest does not promise which
   * module initialises first; `migrate` is idempotent and takes a lock, so the
   * second caller is a no-op rather than a race.
   */
  async initialise(): Promise<string[]> {
    return migrate(this.db);
  }

  async list(learnerId: string): Promise<SavedWord[]> {
    const rows = await this.db.query<SavedWordRow>(
      `select * from saved_words where learner_id = $1 order by saved_at, id`,
      [learnerId],
    );
    return rows.map(toSavedWord);
  }

  async save(word: SavedWord): Promise<SavedWord> {
    const rows = await this.db.query<SavedWordRow>(
      `insert into saved_words (id, learner_id, speaks, learning, term, meaning, sentence,
                                speaker, episode_id, timestamp_ms, saved_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning *`,
      [
        word.id,
        word.learnerId,
        word.speaks,
        word.learning,
        word.term,
        word.meaning,
        word.sentence,
        word.speaker ?? null,
        word.episodeId,
        word.timestampMs,
        word.savedAt,
      ],
    );
    // Read the row back rather than returning the argument: `saved_at` comes
    // back as Postgres stored it, so the response says what was written.
    return toSavedWord(rows[0]);
  }
}

function toSavedWord(row: SavedWordRow): SavedWord {
  return {
    id: row.id,
    learnerId: row.learner_id,
    // Written by this app from a validated `LanguageTag` and never by hand;
    // the column is text because the tag list is a product decision that
    // changes in TypeScript, not a database enum to migrate alongside it.
    speaks: row.speaks as LanguageTag,
    learning: row.learning as LanguageTag,
    term: row.term,
    meaning: row.meaning,
    sentence: row.sentence,
    // `speaker` is optional in the type and nullable in the column; the two
    // spellings of absent do not both belong in the API's answer.
    ...(row.speaker === null ? {} : { speaker: row.speaker }),
    episodeId: row.episode_id,
    timestampMs: row.timestamp_ms,
    savedAt: row.saved_at.toISOString(),
  };
}
