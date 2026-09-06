import type { Metadata } from 'next';

import { pairFromParams, type PairParams } from '../pair';
import { loadEpisodeDetail, loadEpisodeIds, loadPairs } from '@/lib/catalogue';
import { interfaceCopy } from '@/lib/interface-copy';
import { LANGUAGE_NAMES } from '@/lib/language';
import { VocabularyList, type EpisodeVocabulary } from './vocabulary-list';

/**
 * The vocabulary list, one page per pair.
 *
 * It ships every episode's vocabulary, which looks like more than the page
 * needs — the saved words are already stored whole, sentence and all. It is
 * what recovers the records saved before they were: those are bare terms, and
 * the sentence, speaker and timestamp behind one are only findable in the
 * episode it came from. Without this the page would show a returning learner a
 * shorter list than the one they saved. See `readSavedWords`.
 */
export async function generateStaticParams() {
  const pairs = await loadPairs();
  return pairs.map((pair) => ({
    speaks: pair.speaks,
    learning: pair.learning,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: PairParams;
}): Promise<Metadata> {
  const pair = await pairFromParams(params);
  const copy = interfaceCopy(pair.speaks).metadata;
  const title = copy.wordsTitle(LANGUAGE_NAMES[pair.learning]);
  const description = copy.wordsDescription;
  return { title, description, openGraph: { title, description, images: [] } };
}

export default async function VocabularyPage({
  params,
}: {
  params: PairParams;
}) {
  const pair = await pairFromParams(params);
  const ids = await loadEpisodeIds(pair);
  const details = await Promise.all(
    ids.map((id) => loadEpisodeDetail(pair, id)),
  );

  const episodes: EpisodeVocabulary[] = details.flatMap((episode) =>
    episode
      ? [
          {
            id: episode.id,
            episodeTitle: episode.episodeTitle,
            showTitle: episode.showTitle,
            level: episode.level,
            autoTranslated: episode.autoTranslated,
            vocabulary: episode.vocabulary,
          },
        ]
      : [],
  );

  return <VocabularyList episodes={episodes} pair={pair} />;
}
