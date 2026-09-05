import type { Metadata } from 'next';

import { pairFromParams, type PairParams } from '../pair';
import { LEARNING_LEVELS, loadDiscoverCatalogue, loadPairs, type EpisodeCard } from '@/lib/catalogue';
import { LANGUAGE_NAMES } from '@/lib/language';
import { LearningList } from './learning-list';

/**
 * The learning list, one page per pair.
 *
 * What the learner actually saved lives on their device, so this page ships
 * every card in the pair's catalogue and the client picks out the saved ones.
 * That is cheap — nine episodes — and it is what lets the page be static: the
 * alternative is a request per visit for a list the server has never seen.
 *
 * The catalogue is ranked per level and an episode can appear under more than
 * one, so the cards are deduped here rather than in the browser.
 */
export async function generateStaticParams() {
  const pairs = await loadPairs();
  return pairs.map((pair) => ({ speaks: pair.speaks, learning: pair.learning }));
}

export async function generateMetadata({ params }: { params: PairParams }): Promise<Metadata> {
  const pair = await pairFromParams(params);
  const title = `My learning list — ${LANGUAGE_NAMES[pair.learning]} on DiscoPod`;
  const description = 'The episodes you saved, where you stopped, and what you saved from them.';
  return { title, description, openGraph: { title, description, images: [] } };
}

export default async function LearningListPage({ params }: { params: PairParams }) {
  const pair = await pairFromParams(params);
  const catalogue = await loadDiscoverCatalogue(pair);

  const byId = new Map<string, EpisodeCard>();
  for (const level of LEARNING_LEVELS) {
    for (const card of catalogue.byLevel[level]) {
      if (!byId.has(card.id)) byId.set(card.id, card);
    }
  }

  return <LearningList cards={[...byId.values()]} pair={pair} />;
}
