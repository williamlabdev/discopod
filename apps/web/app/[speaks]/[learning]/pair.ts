/**
 * Turning the two route segments back into a pair.
 *
 * `generateStaticParams` only ever emits pairs the API serves, so in a finished
 * build every rendered route is valid. This exists for the other ways a segment
 * can arrive — `next dev`, a hand-typed URL, a stale link after a pair stops
 * being served — where the honest answer is 404 rather than a page rendered for
 * a language nobody publishes. `notFound()` at build time is also how a route
 * that should never have been generated announces itself.
 */

import { notFound } from 'next/navigation';

import { isLanguageTag, type LanguagePair } from '@/lib/language';

export type PairParams = Promise<{ speaks: string; learning: string }>;

export async function pairFromParams(params: PairParams): Promise<LanguagePair> {
  const { speaks, learning } = await params;
  if (!isLanguageTag(speaks) || !isLanguageTag(learning)) notFound();
  return { speaks, learning };
}
