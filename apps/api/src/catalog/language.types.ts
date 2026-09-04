/**
 * The learner's language pair, and the shape of text that is written per
 * language. See docs/adr/0003-model-the-learner-language-pair.md.
 *
 * The short version: a pair is `I speak X, I'm learning Y`. Text in the show's
 * language (transcript, terms, examples, titles) is shared by every pair that
 * learns Y and stays scalar. Only the explanatory layer — the reason, the
 * learning goal, the glosses — is authored per native language, and that is the
 * only thing `Localized` wraps.
 */

/**
 * Closed on purpose. Pairs are added by us, with content behind them; an open
 * `string` would let a typo become an empty catalogue at runtime instead of a
 * type error. `zh-Hant` and `zh-Hans` are separate tags because the script
 * changes the text itself, not merely the gloss.
 */
export const LANGUAGES = ['en', 'zh-Hant', 'zh-Hans'] as const;

export type LanguageTag = (typeof LANGUAGES)[number];

export interface LanguagePair {
  /** The learner's own language. Every explanation is written in this. */
  speaks: LanguageTag;
  /** The language of the audio. Transcript, terms and examples are in this. */
  learning: LanguageTag;
}

/**
 * Authored per native language. `Partial` on purpose: a missing key means
 * untranslated, and untranslated means *excluded from that pair's catalogue* —
 * never silently rendered in English. Absence is representable so that it can
 * be checked, which is what `requireLanguage` is for.
 */
export type Localized<T = string> = Partial<Record<LanguageTag, T>>;

/**
 * Every pair this build serves. One today, and it is degenerate — English audio
 * with English explanations. Naming it is how it stops being invisible; see
 * ADR 0003, decision 6.
 */
export const SUPPORTED_PAIRS = [{ speaks: 'en', learning: 'en' }] as const satisfies readonly LanguagePair[];

export function isLanguageTag(value: unknown): value is LanguageTag {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** The value for this learner's language, or undefined if it was never authored. */
export function inLanguage<T>(field: Localized<T> | undefined, speaks: LanguageTag): T | undefined {
  return field?.[speaks];
}

/**
 * The value for this learner's language, or a loud failure.
 *
 * Callers that render to a learner use this rather than `inLanguage`: falling
 * back to another language would put text the learner did not ask for on the
 * side of the screen reserved for their own, which is the same class of lie as
 * a fabricated ranking signal. `where` names the field so the message says what
 * is missing, not just that something is.
 */
export function requireLanguage<T>(
  field: Localized<T> | undefined,
  speaks: LanguageTag,
  where: string,
): T {
  const value = field?.[speaks];
  if (value === undefined) {
    throw new Error(`${where} has no ${speaks} text — it is not in the ${speaks} catalogue`);
  }
  return value;
}
