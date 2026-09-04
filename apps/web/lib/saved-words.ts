/**
 * Saved words, with the audio context they were saved from.
 *
 * The vision's third pillar is that a word leaves the player carrying its
 * sentence, its speaker and its timestamp, so review can prompt recall by ear
 * rather than as a flashcard. The player used to store `string[]` — the term
 * and nothing else — which threw all of that away at the moment of saving.
 *
 * These records stay on the device. `POST /me/words` on the API models the same
 * fields and is the eventual home for them, but it is not wired up yet and
 * wiring it today would lose data rather than keep it: VocabularyService holds
 * words in memory, discopod-api is on Render's free plan and sleeps after 15
 * idle minutes, and every visitor shares the `anonymous` learner id. Saved
 * words would be destroyed on the first sleep and readable by strangers until
 * then. This shape is deliberately the one SaveWordDto accepts, so the upload
 * is a straight POST once there is a datastore and a learner to own them.
 */

import type { VocabularyItem } from './catalogue';

export interface SavedWord {
  term: string;
  meaning: string;
  /** As it was actually said, where the term is spoken in the episode. */
  sentence: string;
  speaker?: string;
  episodeId: string;
  /**
   * Absent when the term is not spoken in its own episode — see
   * VocabularyItem.occurrence. SaveWordDto requires this, so a record without
   * one cannot be uploaded as-is; it needs the term located first, not a
   * placeholder timestamp invented to satisfy the type.
   */
  timestampMs?: number;
  savedAt: string;
}

export function createSavedWord(episodeId: string, item: VocabularyItem): SavedWord {
  return {
    term: item.term,
    meaning: item.meaning,
    // The spoken line where it exists, the authored example where it does not.
    sentence: item.occurrence?.sentence ?? item.example,
    speaker: item.occurrence?.speaker,
    episodeId,
    timestampMs: item.occurrence?.timestampMs,
    savedAt: new Date().toISOString(),
  };
}

/**
 * Read saved words out of stored progress, upgrading the old `string[]` shape.
 *
 * A returning learner has terms in localStorage with no context attached. Their
 * context is recoverable — the vocabulary entry and the transcript are both in
 * this build — so rebuild the record rather than dropping the save. `savedAt`
 * is unknowable for those, so it becomes the time of the upgrade; that is a
 * worse answer than the truth and a better one than discarding the word.
 */
export function readSavedWords(stored: unknown, episodeId: string, vocabulary: VocabularyItem[]): SavedWord[] {
  if (!Array.isArray(stored)) return [];

  return stored.flatMap((entry): SavedWord[] => {
    if (typeof entry === 'string') {
      const item = vocabulary.find((word) => word.term === entry);
      return item ? [createSavedWord(episodeId, item)] : [];
    }

    // Anything that is not a record with a term is corrupt, not old.
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Partial<SavedWord>;
    if (typeof record.term !== 'string' || typeof record.sentence !== 'string') return [];

    return [
      {
        term: record.term,
        meaning: typeof record.meaning === 'string' ? record.meaning : '',
        sentence: record.sentence,
        speaker: typeof record.speaker === 'string' ? record.speaker : undefined,
        episodeId: typeof record.episodeId === 'string' ? record.episodeId : episodeId,
        timestampMs: typeof record.timestampMs === 'number' ? record.timestampMs : undefined,
        savedAt: typeof record.savedAt === 'string' ? record.savedAt : new Date().toISOString(),
      },
    ];
  });
}
