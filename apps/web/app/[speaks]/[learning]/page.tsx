import { Discover } from './discover';
import { pairFromParams, type PairParams } from './pair';
import { loadDiscoverCatalogue, loadPairs } from '@/lib/catalogue';

/**
 * Server component. The catalogue is fetched from @discopod/api while this
 * builds, so the page ships as static HTML with the ranking already applied —
 * the interactive filtering below it is a client component working over data it
 * was handed, not over a copy of the catalogue kept in the web app.
 *
 * One of these is built per language pair. The catalogue behind `zh-Hant → en`
 * is not a translation of the `en → en` one: it holds the episodes that have a
 * zh-Hant layer and no others, so the two pages can legitimately list different
 * numbers of episodes. See ADR 0003.
 */
export async function generateStaticParams() {
  const pairs = await loadPairs();
  return pairs.map((pair) => ({ speaks: pair.speaks, learning: pair.learning }));
}

export default async function Home({ params }: { params: PairParams }) {
  const pair = await pairFromParams(params);
  const catalogue = await loadDiscoverCatalogue(pair);
  return <Discover catalogue={catalogue} pair={pair} />;
}
