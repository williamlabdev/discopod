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
  fetchStartHere,
  type LearningLevel,
  type RankedEpisode,
  type Show,
  type TranscriptCue,
} from './catalog-api';
import { formatDuration, formatSpeechRate, formatVoices, paletteFor } from './presentation';

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
  /**
   * "One voice" / "3 voices". The only profile dimension besides speech rate
   * that the cards show, because it is the only other one that is measured:
   * vocabularyCoverage, slangLoad and accentLoad are currently derived from the
   * level (and accentLoad is a constant), so showing them would dress a
   * restatement of the level up as a second opinion about the episode. See
   * buildProfile in apps/api/src/catalog/catalog.seed.ts.
   */
  voices: string;
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

/**
 * A vocabulary entry, located in the transcript where it can be.
 *
 * `occurrence` is what lets a saved word carry its audio context — the sentence
 * as it was actually said, who said it, and when — instead of just the term.
 * It is optional because findOccurrence can fail to locate a term — every term
 * in the current catalogue is found, but ingested episodes will not all be so
 * cooperative. Those save with the authored example as their sentence and no
 * timestamp, rather than being given a fabricated one.
 */
export interface VocabularyItem {
  term: string;
  type: string;
  meaning: string;
  example: string;
  occurrence?: { sentence: string; speaker?: string; timestampMs: number; seconds: number };
}

export interface EpisodeDetail extends EpisodeCard {
  learningGoal: string;
  audioSrc?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  transcript: TranscriptLine[];
  vocabulary: VocabularyItem[];
  questions: { prompt: string; options: string[]; answer: number }[];
  previousId: string;
  nextId: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One word of a term, tolerant of inflection. Anchored at a word start and left
 * open at the end so "resist" reaches "resisting", plus the two English endings
 * that change the stem rather than extend it: y→i ("community"/"communities")
 * and a dropped silent e ("make"/"making").
 */
function wordProbe(word: string): string {
  const stems = new Set([word, word.replace(/y$/i, 'i'), word.replace(/e$/i, '')]);
  return `(?:${[...stems].map(escapeRegExp).join('|')})`;
}

/**
 * Find where a term is spoken, most specific match first.
 *
 * A vocabulary term is written in its citation form and the transcript has it
 * conjugated, split, or built with different function words — all twenty-eight
 * terms in the current catalogue are present, but only twenty-five survive a
 * literal match. So try three readings in order of confidence: the phrase, the
 * phrase with one word dropped in ("try again" → "try that again"), then its
 * longest word ("on behalf of" → "on our behalf"). Order matters: the head word
 * alone can occur earlier than the phrase, and the earlier cue would be the
 * wrong place to send a learner.
 */
function findOccurrence(term: string, transcript: TranscriptCue[]) {
  const words = term.trim().split(/\s+/);
  const head = [...words].sort((a, b) => b.length - a.length)[0];

  const probes = [
    new RegExp(`\\b${words.map(wordProbe).join('\\s+')}`, 'i'),
    new RegExp(`\\b${words.map(wordProbe).join('\\s+(?:\\w+\\s+)?')}`, 'i'),
    new RegExp(`\\b${wordProbe(head)}`, 'i'),
  ];

  for (const probe of probes) {
    const cue = transcript.find((entry) => probe.test(entry.text));
    if (cue) {
      return {
        sentence: cue.text,
        speaker: cue.speaker,
        timestampMs: cue.startMs,
        seconds: Math.round(cue.startMs / 1000),
      };
    }
  }

  return undefined;
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
    voices: formatVoices(episode.profile.speakerCount),
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
  /**
   * The API's own "start here" pick per level. Not `byLevel[level][0]`: that is
   * the top of a list this app then filters by interest and search, while this
   * is the API answering "where should this learner begin?" over the whole
   * catalogue. Keeping the API's answer is the point — the vision puts a start
   * here pick above the list, with its reasoning, not a relabelled first row.
   */
  startHere: Record<LearningLevel, EpisodeCard | null>;
  /** Every primary topic present in the catalogue, for the interest filter. */
  topics: string[];
}

export async function loadDiscoverCatalogue(): Promise<DiscoverCatalogue> {
  const shows = await showsById();
  const perLevel = await Promise.all(
    LEARNING_LEVELS.map(async (level) => {
      const [ranked, first] = await Promise.all([
        fetchRankedEpisodes(level),
        fetchStartHere(level),
      ]);
      return [
        level,
        ranked.map((item) => toCard(item, shows.get(item.episode.showId))),
        first ? toCard(first, shows.get(first.episode.showId)) : null,
      ] as const;
    }),
  );

  const byLevel = Object.fromEntries(perLevel.map(([level, cards]) => [level, cards])) as Record<
    LearningLevel,
    EpisodeCard[]
  >;
  const startHere = Object.fromEntries(
    perLevel.map(([level, , first]) => [level, first]),
  ) as Record<LearningLevel, EpisodeCard | null>;

  const topics = [...new Set([...shows.values()].map((show) => show.topics[0]).filter(Boolean))];

  return { byLevel, startHere, topics: topics.sort((a, b) => a.localeCompare(b)) };
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
      occurrence: findOccurrence(entry_.term, episode.transcript),
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
