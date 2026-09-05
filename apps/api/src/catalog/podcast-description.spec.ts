import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { learningGoalFor } from '../ingest/podcasts-from-folder';

/**
 * ADR 0021, enforced on the shipped artifact rather than only at ingest.
 *
 * An ingested episode carries no description. The one it used to carry was
 * generated — `firstSentence(title)` on the English side, which produced the
 * literal string "2" for five episodes and the whole title for twelve, and the
 * Vietnamese translation of the *first transcript cue* on the other, which
 * produced a jingle, an advert read and a sponsor line. Both were then
 * interpolated into `learningGoal`, so the catalogue told a learner it would
 * help them "follow a full Mandarin podcast episode about 2."
 *
 * Nothing caught it because nothing was checking: a description was a required
 * field, so the ingest filled it, and a filled field looks the same as an
 * earned one. This spec is the check that was missing — like ADR 0020's, it
 * runs on the published file rather than at ingest, because the ingest only
 * runs against a source folder outside this repo.
 */

interface Episode {
  id: number;
  duration: string;
  durationSeconds: number;
  description?: unknown;
  learningGoal: Record<string, string>;
}

const SEED = 'catalog.en-zh-Hant.podcasts.seed.json';

const episodes: Episode[] = JSON.parse(
  readFileSync(join(__dirname, 'data', SEED), 'utf8'),
) as Episode[];

/** The same rounding the ingest does, and the same one `duration` is built on. */
function minutesOf(episode: Episode): number {
  return Math.round(episode.durationSeconds / 60);
}

describe(SEED, () => {
  it('ships episodes at all, so the rules below are not vacuous', () => {
    expect(episodes.length).toBeGreaterThan(0);
  });

  it('gives no episode a description, because nobody wrote one', () => {
    const offenders = episodes
      .filter((episode) => episode.description !== undefined)
      .map((episode) => `${episode.id}: ${JSON.stringify(episode.description)}`);
    expect(offenders).toEqual([]);
  });

  it('derives every learning goal from the episode length and nothing else', () => {
    const offenders: string[] = [];
    for (const episode of episodes) {
      const expected = learningGoalFor(minutesOf(episode));
      if (JSON.stringify(episode.learningGoal) !== JSON.stringify(expected)) {
        offenders.push(`${episode.id}: ${JSON.stringify(episode.learningGoal)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * The rounding above has to be the one `duration` already uses, or this spec
   * would be checking the goal against a length the card does not show.
   */
  it('agrees with the duration the card renders', () => {
    for (const episode of episodes) {
      expect(episode.duration).toBe(`${minutesOf(episode)} min`);
    }
  });
});
