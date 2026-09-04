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
 * The pair this build renders.
 *
 * A module constant, not a route parameter — yet. ADR 0003 decides that the
 * pair becomes a route segment (`/[speaks]/[learning]/…`) because ADR 0002
 * bakes the catalogue at build time and a static export has no runtime to ask.
 * Routing is a separate change; this constant is the single place it will be
 * replaced from, and every unwrap below already reads it rather than assuming.
 */
export const ACTIVE_PAIR: LanguagePair = { speaks: 'en', learning: 'en' };

/**
 * The text for the active pair's language, or a build failure naming it.
 *
 * There is deliberately no fallback. Rendering an English gloss to a learner
 * who asked for Chinese is the same class of lie as a fabricated ranking
 * signal — the app would be showing them their "native-language side" in a
 * language they did not ask for. Every call here happens during `next build`,
 * so absence stops a release instead of blanking a region on a live page.
 */
export function pick<T>(field: Localized<T> | undefined, where: string): T {
  const value = field?.[ACTIVE_PAIR.speaks];
  if (value === undefined) {
    throw new Error(
      `${where} has no ${ACTIVE_PAIR.speaks} text. An episode missing the pair's ` +
        `language is not in that pair's catalogue — author the layer or drop the episode.`,
    );
  }
  return value;
}

export function isLanguageTag(value: unknown): value is LanguageTag {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Whether the active pair's text exists, without throwing. For assertions. */
export function has<T>(field: Localized<T> | undefined): boolean {
  return field?.[ACTIVE_PAIR.speaks] !== undefined;
}
