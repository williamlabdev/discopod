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
import type { SpokenLanguage } from './language.types';

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
 *
 * Keyed by `SpokenLanguage`, which is what the header claims and what this
 * table now actually gets. It used to be keyed by `LanguageTag` and read
 * `{ en: 'wpm', 'zh-Hant': 'cpm', 'zh-Hans': 'cpm' }` — two rows with identical
 * values, because a script cannot change how fast someone talks. That
 * duplication was the visible end of the conflation ADR 0006 removes: it was
 * asking a question about audio in a type that names text.
 */
const RATE_UNIT: Record<SpokenLanguage, SpeechRateUnit> = {
  en: 'wpm',
  cmn: 'cpm',
};

export function rateUnitFor(language: SpokenLanguage): SpeechRateUnit {
  return RATE_UNIT[language];
}

/**
 * The rate a learner at each level can comfortably follow, per unit.
 *
 * Still `Partial`, and the type stays that way on purpose: a unit with no row
 * is an exclusion, exactly as an untranslated episode is. `speaksTo` will not
 * put an episode it cannot honestly rank into anyone's catalogue, and the next
 * spoken language added to `RATE_UNIT` inherits that rule rather than a
 * default.
 *
 * ## Where the numbers come from
 *
 * `wpm` is the original row and predates this comment.
 *
 * `cpm` is **extrapolated, not measured**, and that is the whole of its
 * provenance. It is set at the same ratios to natural conversational speed that
 * the `wpm` row sits at for English: against ~155 wpm, the English thresholds
 * are 0.71 / 0.94 / 1.16, and Mandarin conversational speech of ~240 characters
 * per minute puts those ratios at 170 / 225 / 280. Rounded to 170 / 220 / 280.
 *
 * This is a claim, and it is stated in a form that can be argued with — the
 * anchor rate, the ratios and the arithmetic are all here, so disagreeing with
 * it means disagreeing with one of them rather than with a bare number. That is
 * the bar ADR 0004 sets: not that the figure be proven, but that somebody own
 * it and show their working. William owns these three, 2026-09-04.
 *
 * It is not calibrated against this project's own listeners, and nothing here
 * pretends otherwise. Replace it with measured thresholds when there are any;
 * until then, a Mandarin episode's suitability score is as good as this
 * extrapolation and no better.
 *
 * The ~240 anchor has since been spot-checked against one recording — a native
 * speaker's unscripted question measured 232 cpm — which tests the input, not
 * these three numbers. How fast someone talks is not how fast a learner can
 * follow. ADR 0008 records the measurement and its weaknesses.
 */
const COMFORTABLE_RATE: Partial<Record<SpeechRateUnit, Record<LearningLevel, number>>> = {
  wpm: {
    Beginner: 110,
    Intermediate: 145,
    Advanced: 180,
  },
  cpm: {
    Beginner: 170,
    Intermediate: 220,
    Advanced: 280,
  },
};

export function comfortableRate(unit: SpeechRateUnit, level: LearningLevel): number | undefined {
  return COMFORTABLE_RATE[unit]?.[level];
}

/** Whether this unit has thresholds at all, and so can be ranked. */
export function isCalibrated(unit: SpeechRateUnit): boolean {
  return COMFORTABLE_RATE[unit] !== undefined;
}
