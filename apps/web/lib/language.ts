/**
 * The learner's language pair, mirrored from
 * `apps/api/src/catalog/language.types.ts`.
 *
 * Declared again rather than imported for the same reason the wire types are
 * (see catalog-api.ts): the contract between the two apps is HTTP, and the web
 * app must keep building against an API deployed from a different commit. The
 * cost of the duplication is that the two can drift; `pick` and the assertions
 * in catalog-api.ts are what turn drift into a failed build with a name in it.
 *
 * There is deliberately **no `ACTIVE_PAIR` constant here any more.** There was
 * one, and it was the honest shape while the app rendered a single pair: one
 * place to change, read by every unwrap. It stopped being honest the moment two
 * pairs had to exist in the same build, because a module constant can hold one
 * value per build and the answer is now per route. The pair comes from the URL
 * — `/[speaks]/[learning]/…` — and is passed down explicitly. Every function
 * below takes it as an argument, so no layer can quietly assume one.
 *
 * See docs/adr/0003-model-the-learner-language-pair.md.
 */

export const LANGUAGES = ['en', 'zh-Hant', 'zh-Hans'] as const;

export type LanguageTag = (typeof LANGUAGES)[number];

export interface LanguagePair {
  /** The learner's own language. Every explanation is written in this. */
  speaks: LanguageTag;
  /** The language of the audio. Transcript, terms and examples are in this. */
  learning: LanguageTag;
}

/** A missing key means untranslated, never English. */
export type Localized<T = string> = Partial<Record<LanguageTag, T>>;

/**
 * Each language's name in itself, not in English.
 *
 * A learner picking `zh-Hant` is looking for 繁體中文 on the page, and having to
 * recognise "Traditional Chinese" first is the app asking them to already know
 * the language they came here to be spoken to in.
 */
export const LANGUAGE_NAMES: Record<LanguageTag, string> = {
  en: 'English',
  'zh-Hant': '繁體中文',
  'zh-Hans': '简体中文',
};

/** The URL prefix a pair's pages live under. The one place this is spelled. */
export function pairPath(pair: LanguagePair): string {
  return `/${pair.speaks}/${pair.learning}`;
}

/**
 * The text for this pair's language, or a build failure naming it.
 *
 * There is deliberately no fallback. Rendering an English gloss to a learner
 * who asked for Chinese is the same class of lie as a fabricated ranking
 * signal — the app would be showing them their "native-language side" in a
 * language they did not ask for. Every call here happens during `next build`,
 * so absence stops a release instead of blanking a region on a live page.
 */
export function pick<T>(field: Localized<T> | undefined, speaks: LanguageTag, where: string): T {
  const value = field?.[speaks];
  if (value === undefined) {
    throw new Error(
      `${where} has no ${speaks} text. An episode missing the pair's language is ` +
        `not in that pair's catalogue — author the layer or drop the episode.`,
    );
  }
  return value;
}

/**
 * The text where the field is genuinely optional.
 *
 * Only for fields whose absence is a fact rather than a gap — today that is
 * `TranscriptCue.translation`, where "this line was never translated" is a real
 * state and rendering nothing is the right answer. Everything a page needs in
 * order to make sense goes through `pick` and fails the build instead.
 */
export function pickOptional<T>(
  field: Localized<T> | undefined,
  speaks: LanguageTag,
): T | undefined {
  return field?.[speaks];
}

export function isLanguageTag(value: unknown): value is LanguageTag {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Whether this language's text exists, without throwing. For assertions. */
export function has<T>(field: Localized<T> | undefined, speaks: LanguageTag): boolean {
  return field?.[speaks] !== undefined;
}
