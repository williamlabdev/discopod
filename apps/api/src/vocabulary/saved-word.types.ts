import type { LanguageTag } from '../catalog/language.types';

/**
 * A word saved from the player. It carries the audio context with it —
 * sentence, speaker and timestamp — so review can prompt recall by ear,
 * the way the word will actually arrive next time.
 *
 * It also carries the pair it was saved under. This is the one field in the
 * app that is genuinely user-owned and cannot be regenerated, and it is free
 * to change today only because nothing is stored yet: VocabularyService is
 * in-memory. That will not be true again.
 */
export interface SavedWord {
  id: string;
  learnerId: string;
  /** The learner's language — the one `meaning` is written in. */
  speaks: LanguageTag;
  /** The language of the word itself. */
  learning: LanguageTag;
  term: string;
  meaning: string;
  sentence: string;
  speaker?: string;
  episodeId: string;
  timestampMs: number;
  savedAt: string;
}
