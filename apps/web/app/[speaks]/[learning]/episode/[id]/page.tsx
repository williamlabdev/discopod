import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { pairFromParams, type PairParams } from '../../pair';
import { loadEpisodeDetail, loadEpisodeIds, loadPairs } from '@/lib/catalogue';
import { LANGUAGE_NAMES } from '@/lib/language';
import { EpisodeLearning } from './episode-learning';

type EpisodePageProps = {
  params: PairParams & Promise<{ id: string }>;
};

/**
 * The route set comes from the API, so an episode added to the catalogue gets a
 * page on the next build without anything here changing.
 *
 * It is a cross product of pairs and episodes, but a ragged one: the episode
 * ids are asked for per pair, because an episode with no layer in a pair's
 * language is not in that pair's catalogue and must not get a page under it.
 * Translating one more episode therefore adds exactly one route.
 */
export async function generateStaticParams() {
  const pairs = await loadPairs();
  const perPair = await Promise.all(
    pairs.map(async (pair) => {
      const ids = await loadEpisodeIds(pair);
      return ids.map((id) => ({ speaks: pair.speaks, learning: pair.learning, id }));
    }),
  );
  return perPair.flat();
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const pair = await pairFromParams(params);
  const { id } = await params;
  const episode = await loadEpisodeDetail(pair, id);
  if (!episode) return { title: 'Lesson not found — DiscoPod' };

  // The taught language is the pair's, not a constant. This said "English"
  // unconditionally, which would have put an English label on a Mandarin lesson
  // the moment the catalogue had one — in the page title, which is the one piece
  // of copy that follows the link out of the app.
  const title = `${episode.episodeTitle} — ${episode.level} ${LANGUAGE_NAMES[pair.learning]} lesson`;
  const description = `${episode.showTitle}: ${episode.learningGoal}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { card: 'summary', title, description, images: [] },
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const pair = await pairFromParams(params);
  const { id } = await params;
  const episode = await loadEpisodeDetail(pair, id);
  if (!episode) notFound();
  return <EpisodeLearning episode={episode} pair={pair} />;
}
