/**
 * How fast the audio is, in a unit that says what it is counting.
 *
 * `speechRate` was a bare number, and the number meant English words per
 * minute because every episode was English. That assumption is load-bearing in
 * a way a comment cannot hold: the whole product is "can this learner follow it
 * by ear?", the rate is the heaviest term in that score, and Mandarin measured
 * in characters per minute lands on a completely different scale from English
 * measured in words. Feed one into thresholds calibrated for the other and the
 * ranking is not slightly off — it is meaningless, while still looking like a
 * number. So the measurement carries its unit.
 *
 * The unit is a property of the audio's language, never of the learner's: it is
 * the same 105 wpm whether the reader is reading about it in English or in
 * Chinese. That is why it lives on the profile rather than being chosen at
 * render time.
 */

import type { LearningLevel } from './catalog.types';
import type { LanguageTag } from './language.types';

/**
 * `wpm` counts orthographic words, `cpm` counts Han characters. They are not
 * convertible: a two-character Chinese word is one word and two characters, and
 * which of those a listener has to process is exactly what the unit encodes.
 */
export type SpeechRateUnit = 'wpm' | 'cpm';

export interface SpeechRate {
  value: number;
  unit: SpeechRateUnit;
}

/**
 * The unit each language's speech is measured in. Knowing how you would count
 * Mandarin is not the same as knowing how fast is too fast — see below.
 */
const RATE_UNIT: Record<LanguageTag, SpeechRateUnit> = {
  en: 'wpm',
  'zh-Hant': 'cpm',
  'zh-Hans': 'cpm',
};

export function rateUnitFor(language: LanguageTag): SpeechRateUnit {
  return RATE_UNIT[language];
}

/**
 * The rate a learner at each level can comfortably follow, per unit.
 *
 * Deliberately `Partial`, and deliberately holding only `wpm`. Numbers for
 * `cpm` exist in the literature, but not ones this project has checked against
 * its own listeners, and inventing three of them would be the same act as
 * inventing a suitability score: a fabricated ranking signal wearing the same
 * clothes as a measured one. An uncalibrated unit is therefore an exclusion,
 * exactly as an untranslated episode is — `CatalogService.speaksTo` will not
 * put an episode it cannot honestly rank into anyone's catalogue.
 *
 * Adding Chinese audio to this app means adding a `cpm` row here, and that row
 * is a claim someone has to stand behind.
 */
const COMFORTABLE_RATE: Partial<Record<SpeechRateUnit, Record<LearningLevel, number>>> = {
  wpm: {
    Beginner: 110,
    Intermediate: 145,
    Advanced: 180,
  },
};

export function comfortableRate(unit: SpeechRateUnit, level: LearningLevel): number | undefined {
  return COMFORTABLE_RATE[unit]?.[level];
}

/** Whether this unit has thresholds at all, and so can be ranked. */
export function isCalibrated(unit: SpeechRateUnit): boolean {
  return COMFORTABLE_RATE[unit] !== undefined;
}
