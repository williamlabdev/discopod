/**
 * A word saved from the player. It carries the audio context with it —
 * sentence, speaker and timestamp — so review can prompt recall by ear,
 * the way the word will actually arrive next time.
 */
export interface SavedWord {
  id: string;
  learnerId: string;
  term: string;
  meaning: string;
  sentence: string;
  speaker?: string;
  episodeId: string;
  timestampMs: number;
  savedAt: string;
}
