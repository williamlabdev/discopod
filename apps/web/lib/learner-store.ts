/**
 * Everything the learner's own device remembers, and the one place that knows
 * its shape.
 *
 * The episode page has written `discopod-progress-<speaks>-<learning>-<id>`
 * since the pair model landed, and it was the only reader of what it wrote — a
 * key built inline, parsed inline, one episode at a time. Two pages now read
 * across all of it (the learning list and the vocabulary list), and a second
 * inline copy of that key would be a silent divergence the moment either side
 * changed. So the key builder and the parser live here, and the episode page
 * imports them.
 *
 * These records never leave the device. `POST /me/words` models the same fields
 * and is their eventual home; see the note on `SavedWord` for why uploading
 * them today would lose them.
 */

import type { VocabularyItem } from './catalogue';
import type { LanguagePair } from './language';
import { readSavedWords, type SavedWord } from './saved-words';

/** Progress for one episode under one pair. */
export function progressKey(pair: LanguagePair, episodeId: string): string {
  return `discopod-progress-${pair.speaks}-${pair.learning}-${episodeId}`;
}

/**
 * The key an `en → en` build wrote before pairs existed.
 *
 * Only that build ever wrote it, so it is read back only under that pair —
 * reading it under `zh-Hant → en` would hand an English learner someone else's
 * progress. Same reasoning as `LEGACY_PAIR` in `saved-words.ts`.
 */
export function legacyProgressKey(pair: LanguagePair, episodeId: string): string | null {
  return pair.speaks === 'en' && pair.learning === 'en' ? `tuned-progress-${episodeId}` : null;
}

/** The episodes this learner put on their list, under this pair. */
export function listKey(pair: LanguagePair): string {
  return `discopod-list-${pair.speaks}-${pair.learning}`;
}

export interface EpisodeProgress {
  episodeId: string;
  /** Seconds into the audio, as of the last visit. */
  currentTime: number;
  complete: boolean;
  savedWords: SavedWord[];
  answeredCount: number;
  checked: boolean;
}

/**
 * `null` for anything unreadable, which is not the same as empty.
 *
 * A private window rejects storage and a corrupt value throws; both mean "this
 * device has nothing to tell us", and neither may be reported to the learner as
 * "you have not started this episode".
 */
function readJson(key: string | null): unknown {
  if (!key || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/**
 * One episode's stored progress, or `null` if this device has none for it.
 *
 * `vocabulary` is how a pre-pair save is recovered: those records are bare
 * terms, and rebuilding one needs the episode's vocabulary entry to find the
 * sentence, speaker and timestamp again. Pass `[]` and those entries are simply
 * absent from the result — they are not deleted from storage, and the episode
 * page rebuilds them the next time it is opened.
 */
export function readProgress(
  pair: LanguagePair,
  episodeId: string,
  vocabulary: VocabularyItem[] = [],
): EpisodeProgress | null {
  const stored =
    readJson(progressKey(pair, episodeId)) ?? readJson(legacyProgressKey(pair, episodeId));
  if (!stored || typeof stored !== 'object') return null;

  const value = stored as {
    currentTime?: number;
    complete?: boolean;
    savedWords?: unknown;
    answers?: Record<string, number>;
    checked?: boolean;
  };

  return {
    episodeId,
    currentTime: typeof value.currentTime === 'number' ? value.currentTime : 0,
    complete: Boolean(value.complete),
    savedWords: readSavedWords(pair, value.savedWords, episodeId, vocabulary),
    answeredCount: value.answers ? Object.keys(value.answers).length : 0,
    checked: Boolean(value.checked),
  };
}

/** Progress for every episode named, in the order given, skipping the untouched. */
export function readAllProgress(
  pair: LanguagePair,
  episodes: { id: string; vocabulary?: VocabularyItem[] }[],
): EpisodeProgress[] {
  return episodes.flatMap((episode) => {
    const progress = readProgress(pair, episode.id, episode.vocabulary ?? []);
    return progress ? [progress] : [];
  });
}

export function readList(pair: LanguagePair): string[] {
  const stored = readJson(listKey(pair));
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
}

export function writeList(pair: LanguagePair, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(listKey(pair), JSON.stringify(ids));
  } catch {
    // Saving to a list is an enhancement; a private window still gets the app.
  }
}

/**
 * Move an episode's stored position back to the start, or put one back.
 *
 * Only the position. `savedWords`, `answers` and `checked` are written through
 * untouched, because taking an episode off the learning list must not empty the
 * vocabulary list — a position is regenerated by pressing play, a saved word is
 * not. A record that does not exist is not created: there is no position to
 * clear on an episode this device has never opened.
 *
 * The write always goes to the current key even when the value was read from
 * the legacy one, which is the same precedence `readProgress` applies.
 */
export function writeListeningPosition(
  pair: LanguagePair,
  episodeId: string,
  position: { currentTime: number; complete: boolean },
): void {
  if (typeof window === 'undefined') return;
  const stored =
    readJson(progressKey(pair, episodeId)) ?? readJson(legacyProgressKey(pair, episodeId));
  if (!stored || typeof stored !== 'object') return;
  try {
    window.localStorage.setItem(
      progressKey(pair, episodeId),
      JSON.stringify({ ...stored, currentTime: position.currentTime, complete: position.complete }),
    );
  } catch {
    // Same as writeList: a device that refuses storage still gets the page.
  }
}

/** `mm:ss`, for a position in an episode. Not a duration — see the list page. */
export function formatPosition(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
