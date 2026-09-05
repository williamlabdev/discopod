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
 * A **written form**: a language together with the script it is written in.
 *
 * Closed on purpose. Pairs are added by us, with content behind them; an open
 * `string` would let a typo become an empty catalogue at runtime instead of a
 * type error. `zh-Hant` and `zh-Hans` are separate tags because the script
 * changes the text itself, not merely the gloss.
 *
 * This is the right key for *text* and only for text — `Localized`, the route
 * segments, an overlay file's name. It is the wrong type for a fact about
 * audio, because the two Chinese tags name one spoken language. What audio is
 * in is `SpokenLanguage`. See ADR 0006.
 */
export const LANGUAGES = ['en', 'zh-Hant', 'zh-Hans', 'vi'] as const;

export type LanguageTag = (typeof LANGUAGES)[number];

/**
 * What comes out of a speaker. `cmn` is Mandarin, ISO 639-3, and it is one
 * language whether it is written down in traditional or simplified characters.
 *
 * This exists because the app kept asking two different questions with one
 * type. "Which text do I show this reader?" is answered by a written form.
 * "How is this audio counted, and what does the learner hear?" is answered
 * here. Conflating them meant a Mandarin show had to pick a script in order to
 * exist, and then only reached learners who read that script — for a property
 * of its transcript, not of its sound.
 */
export const SPOKEN_LANGUAGES = ['en', 'cmn', 'vi'] as const;

export type SpokenLanguage = (typeof SPOKEN_LANGUAGES)[number];

/** The writing system a `LanguageTag`'s text is set in. */
export const SCRIPTS = ['Latn', 'Hant', 'Hans'] as const;

export type Script = (typeof SCRIPTS)[number];

/**
 * The decomposition of every written form we serve.
 *
 * Written out rather than parsed off the tag string. Parsing would be shorter
 * and would be guessing: `zh-Hant` says traditional Chinese script, and that
 * script is also how Cantonese is written in Hong Kong. It maps to `cmn` here
 * because *this catalogue's* Chinese is Mandarin, which is a claim about our
 * content and belongs in a table someone has to edit. Cantonese arrives as its
 * own tag (`yue-Hant`), and because `LANGUAGES` is a closed union that arrival
 * is a type error listing every place that has to answer for it — rather than
 * a Cantonese show quietly counted as Mandarin.
 */
const WRITTEN_FORMS = {
  en: { spoken: 'en', script: 'Latn' },
  'zh-Hant': { spoken: 'cmn', script: 'Hant' },
  'zh-Hans': { spoken: 'cmn', script: 'Hans' },
  vi: { spoken: 'vi', script: 'Latn' },
} as const satisfies Record<LanguageTag, { spoken: SpokenLanguage; script: Script }>;

/** Which language this text is written in — one spoken language, many scripts. */
export function spokenLanguageOf(tag: LanguageTag): SpokenLanguage {
  return WRITTEN_FORMS[tag].spoken;
}

/** Which writing system this text is set in. */
export function scriptOf(tag: LanguageTag): Script {
  return WRITTEN_FORMS[tag].script;
}

/**
 * Every written form of a spoken language.
 *
 * Note what this is *not* licence to do: having both forms in this list does
 * not mean text in one can be produced from text in the other. Hant→Hans is
 * many-to-one (發 and 髮 are both 发), so a conversion is a lossy guess, and a
 * guess presented as the learner's own reading is exactly the fabrication the
 * repo's standing rules forbid elsewhere. A transcript exists in the script it
 * was authored in; the other script is a translation job, not a function call.
 */
export function writtenFormsOf(spoken: SpokenLanguage): readonly LanguageTag[] {
  return LANGUAGES.filter((tag) => WRITTEN_FORMS[tag].spoken === spoken);
}

export interface LanguagePair {
  /** The learner's own language. Every explanation is written in this. */
  speaks: LanguageTag;
  /**
   * The written form of what is being learned: the script the learner reads the
   * transcript, terms and examples in. Both halves of a pair are written forms,
   * because a pair selects *text*. What the learner hears is
   * `spokenLanguageOf(learning)`, and one spoken language can appear here twice.
   */
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
 * The pair a caller gets when it does not name one.
 *
 * This used to be `SUPPORTED_PAIRS`, a hand-written list of one. Which pairs
 * exist is not a constant: it follows from which episodes carry which language
 * layer and which languages have a reason renderer, so it is now derived from
 * the catalogue — `CatalogService.listPairs`, served at `GET /pairs`, and used
 * by the web app to generate one route subtree per pair. What stays hard-coded
 * is only this: the answer for a request that says nothing.
 *
 * It was `en → en` until 2026-09-05, which was a default pointing at a pair
 * the product does not serve — English audio explained in English is nobody's
 * language learning. DiscoPod runs in two directions, an English speaker
 * learning Chinese and a Chinese speaker learning English, and this names the
 * first of them. It is a default, not a ranking: the other direction is served
 * as fully, and the onboarding question in VISION.md is what actually chooses.
 * ADR 0012.
 */
export const DEFAULT_PAIR = {
  speaks: 'en',
  learning: 'zh-Hant',
} as const satisfies LanguagePair;

export function isLanguageTag(value: unknown): value is LanguageTag {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function isSpokenLanguage(value: unknown): value is SpokenLanguage {
  return typeof value === 'string' && (SPOKEN_LANGUAGES as readonly string[]).includes(value);
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
