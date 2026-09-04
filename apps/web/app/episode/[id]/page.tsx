import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadEpisodeDetail, loadEpisodeIds } from '@/lib/catalogue';
import { EpisodeLearning } from './episode-learning';

type EpisodePageProps = {
  params: Promise<{ id: string }>;
};

/**
 * The route set comes from the API, so an episode added to the catalogue gets a
 * page on the next build without anything here changing.
 */
export async function generateStaticParams() {
  const ids = await loadEpisodeIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const { id } = await params;
  const episode = await loadEpisodeDetail(id);
  if (!episode) return { title: 'Lesson not found — DiscoPod' };

  const title = `${episode.episodeTitle} — ${episode.level} English lesson`;
  const description = `${episode.showTitle}: ${episode.learningGoal}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { card: 'summary', title, description, images: [] },
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;
  const episode = await loadEpisodeDetail(id);
  if (!episode) notFound();
  return <EpisodeLearning episode={episode} />;
}
