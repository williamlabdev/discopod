/**
 * Build-time catalogue loading.
 *
 * Every function here runs during `next build` and never in the browser. The
 * result is baked into the static export, so the deployed site has no runtime
 * dependency on the API — which matters because the API runs on a free instance
 * that sleeps. See docs/adr/0002-fetch-the-catalogue-at-build-time.md.
 *
 * These functions also do the joining. The API returns episodes and shows
 * separately, as a domain service should; the pages want one object per card.
 */

import {
  fetchEpisode,
  fetchRankedEpisodes,
  fetchShows,
  type LearningLevel,
  type RankedEpisode,
  type Show,
} from './catalog-api';
import { formatDuration, formatSpeechRate, paletteFor } from './presentation';

export const LEARNING_LEVELS: LearningLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export type { LearningLevel };

export interface EpisodeCard {
  id: string;
  showId: string;
  showTitle: string;
  publisher: string;
  topic: string;
  tags: string[];
  episodeTitle: string;
  description: string;
  level: LearningLevel;
  cefr: string;
  /** From the API's ranking. The old hand-written "match" number is gone. */
  suitability: number;
  /** Why the API ranked it here — full sentence, shown on the episode page. */
  fitReason: string;
  /** The profile's own one-line reason — shown on the card. */
  levelReason: string;
  speed: string;
  duration: string;
  newWords: number;
  publisherTranscript: boolean;
  tone: string;
  ink: string;
}

export interface TranscriptLine {
  time: string;
  seconds: number;
  speaker?: string;
  text: string;
  highlight?: string;
}

export interface EpisodeDetail extends EpisodeCard {
  learningGoal: string;
  audioSrc?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  transcript: TranscriptLine[];
  vocabulary: { term: string; type: string; meaning: string; example: string }[];
  questions: { prompt: string; options: string[]; answer: number }[];
  previousId: string;
  nextId: string;
}

function formatCueTime(startMs: number): string {
  const total = Math.round(startMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function toCard(ranked: RankedEpisode, show: Show | undefined): EpisodeCard {
  const { episode } = ranked;
  const { tone, ink } = paletteFor(episode.showId);
  const topics = show?.topics ?? [];

  return {
    id: episode.id,
    showId: episode.showId,
    showTitle: show?.title ?? episode.showId,
    publisher: show?.publisher ?? '',
    topic: topics[0] ?? 'Listening',
    tags: topics.slice(1),
    episodeTitle: episode.title,
    description: episode.description,
    level: episode.profile.level,
    cefr: episode.profile.cefr,
    suitability: ranked.suitability,
    fitReason: ranked.reason,
    levelReason: episode.profile.reason,
    speed: formatSpeechRate(episode.profile.speechRate),
    duration: formatDuration(episode.durationSeconds),
    newWords: episode.newWordCount,
    publisherTranscript: episode.publisherTranscript,
    tone,
    ink,
  };
}

async function showsById(): Promise<Map<string, Show>> {
  const shows = await fetchShows();
  return new Map(shows.map((show) => [show.id, show]));
}

export interface DiscoverCatalogue {
  /** Ranked separately per level: the same episode scores differently by level. */
  byLevel: Record<LearningLevel, EpisodeCard[]>;
  /** Every primary topic present in the catalogue, for the interest filter. */
  topics: string[];
}

export async function loadDiscoverCatalogue(): Promise<DiscoverCatalogue> {
  const shows = await showsById();
  const perLevel = await Promise.all(
    LEARNING_LEVELS.map(async (level) => {
      const ranked = await fetchRankedEpisodes(level);
      return [level, ranked.map((item) => toCard(item, shows.get(item.episode.showId)))] as const;
    }),
  );

  const byLevel = Object.fromEntries(perLevel) as Record<LearningLevel, EpisodeCard[]>;
  const topics = [...new Set([...shows.values()].map((show) => show.topics[0]).filter(Boolean))];

  return { byLevel, topics: topics.sort((a, b) => a.localeCompare(b)) };
}

/** Every episode id, in the API's default ranking order. Drives the static routes. */
export async function loadEpisodeIds(): Promise<string[]> {
  const ranked = await fetchRankedEpisodes();
  return ranked.map((item) => item.episode.id);
}

export async function loadEpisodeDetail(id: string): Promise<EpisodeDetail | null> {
  const episode = await fetchEpisode(id);
  if (!episode) return null;

  const shows = await showsById();
  const show = shows.get(episode.showId);

  // The card fields need the ranked view, so take this episode's entry from the
  // list ranked for its own level — that is the reader looking at this page.
  const ranked = await fetchRankedEpisodes(episode.profile.level);
  const entry = ranked.find((item) => item.episode.id === id);
  if (!entry) {
    throw new Error(`Episode ${id} exists but is absent from the ${episode.profile.level} ranking`);
  }

  // Neighbours come from the full ordering, not from id arithmetic: ids are
  // opaque strings from the API and will not stay contiguous after ingestion.
  const order = await loadEpisodeIds();
  const index = order.indexOf(id);
  const previousId = order[(index - 1 + order.length) % order.length];
  const nextId = order[(index + 1) % order.length];

  return {
    ...toCard(entry, show),
    learningGoal: episode.learningGoal,
    audioSrc: episode.audioUrl,
    sourceUrl: show?.sourceUrl,
    sourceLabel: show ? `${show.publisher} · ${episode.title}` : undefined,
    transcript: episode.transcript.map((cue) => ({
      time: formatCueTime(cue.startMs),
      seconds: Math.round(cue.startMs / 1000),
      speaker: cue.speaker,
      text: cue.text,
      highlight: cue.highlight,
    })),
    vocabulary: episode.vocabulary.map((entry_) => ({
      term: entry_.term,
      type: entry_.partOfSpeech,
      meaning: entry_.meaning,
      example: entry_.example,
    })),
    questions: episode.questions.map((question) => ({
      prompt: question.prompt,
      options: question.options,
      answer: question.answerIndex,
    })),
    previousId,
    nextId,
  };
}
