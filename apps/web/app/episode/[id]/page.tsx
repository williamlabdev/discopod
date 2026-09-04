import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPodcast, podcasts } from '@/lib/podcasts';
import { EpisodeLearning } from './episode-learning';

type EpisodePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return podcasts.map((podcast) => ({ id: String(podcast.id) }));
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const { id } = await params;
  const podcast = getPodcast(id);
  if (!podcast) return { title: 'Lesson not found — DiscoPod' };

  const title = `${podcast.episode} — ${podcast.level} English lesson`;
  const description = `${podcast.title}: ${podcast.learningGoal}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { card: 'summary', title, description, images: [] },
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { id } = await params;
  const podcast = getPodcast(id);
  if (!podcast) notFound();
  return <EpisodeLearning podcast={podcast} />;
}
