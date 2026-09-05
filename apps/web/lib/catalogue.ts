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
  fetchPairs,
  fetchRankedEpisodes,
  fetchShows,
  fetchStartHere,
  type LearningLevel,
  type RankedEpisode,
  type TocflBand,
  type Show,
  type TranscriptCue,
} from './catalog-api';
import { has, pick, pickOptional, type LanguagePair } from './language';

export { fetchPairs as loadPairs };
export type { LanguagePair };
import { formatDuration, formatSpeechRate, formatVoices, paletteFor } from './presentation';

export const LEARNING_LEVELS: LearningLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export type { LearningLevel };

/**
 * The view models below are flat strings, not `Localized` maps, on purpose.
 * This module is the boundary: the API's language-keyed fields are unwrapped
 * here for one pair, once, at build time, so components render text and never
 * choose a language. `pick` throws if the active pair's key is absent — see
 * lib/language.ts and ADR 0003.
 */
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
  cefr?: string;
  tocfl?: TocflBand;
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
  /**
   * The same number `voices` is formatted from, kept because the page makes a
   * claim that depends on it — an episode with one speaker is not a
   * conversation — and re-deriving that by parsing "One voice" back into a
   * number would be reading prose to recover a fact we already had.
   */
  speakerCount: number;
  duration: string;
  newWords: number;
  publisherTranscript: boolean;
  ratedBy?: 'transcript-only';
  overlayVerified?: boolean;
  tone: string;
  ink: string;
}

export interface TranscriptLine {
  time: string;
  seconds: number;
  speaker?: string;
  text: string;
  /**
   * The line in the learner's own language, where it has been written. Absent
   * is a real state — an untranslated line, or an `en → en` pair where the
   * transcript already is the learner's language — so the player renders
   * nothing rather than falling back. See lib/language.ts, pickOptional.
   */
  translation?: string;
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
  licence?: { name: string; url: string };
  /** True when the audio shipped here is not the publisher's file. */
  audioModified?: boolean;
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

function locate(cue: TranscriptCue) {
  return {
    sentence: cue.text,
    speaker: cue.speaker,
    timestampMs: cue.startMs,
    seconds: Math.round(cue.startMs / 1000),
  };
}

/** Any Han character. Enough to know the term is not written with spaces. */
const HAN = /\p{Script=Han}/u;

/**
 * Find where a term is spoken, most specific match first.
 *
 * A vocabulary term is written in its citation form and the transcript has it
 * conjugated, split, or built with different function words — all twenty-eight
 * English terms in the current catalogue are present, but only twenty-five
 * survive a literal match. So try three readings in order of confidence: the
 * phrase, the phrase with one word dropped in ("try again" → "try that again"),
 * then its longest word ("on behalf of" → "on our behalf"). Order matters: the
 * head word alone can occur earlier than the phrase, and the earlier cue would
 * be the wrong place to send a learner.
 *
 * All of that is English morphology, and none of it survives contact with
 * Chinese. A Han term has no spaces to split on, no inflections to stem, and no
 * `\b` to anchor against — Han characters are not `\w`, so `\b佛塔` matches
 * nothing, ever. Episode 101 is where that showed: five vocabulary entries, all
 * five plainly present in the transcript, all five rendering "we couldn't
 * locate this word". So a Han term is matched as a substring, which is what
 * "this word appears in this line" means in a script written without spaces.
 */
function findOccurrence(term: string, transcript: TranscriptCue[]) {
  const needle = term.trim();

  if (HAN.test(needle)) {
    const cue = transcript.find((entry) => entry.text.includes(needle));
    return cue ? locate(cue) : undefined;
  }

  const words = needle.split(/\s+/);
  const head = [...words].sort((a, b) => b.length - a.length)[0];

  const probes = [
    new RegExp(`\\b${words.map(wordProbe).join('\\s+')}`, 'i'),
    new RegExp(`\\b${words.map(wordProbe).join('\\s+(?:\\w+\\s+)?')}`, 'i'),
    new RegExp(`\\b${wordProbe(head)}`, 'i'),
  ];

  for (const probe of probes) {
    const cue = transcript.find((entry) => probe.test(entry.text));
    if (cue) return locate(cue);
  }

  return undefined;
}

function formatCueTime(startMs: number): string {
  const total = Math.round(startMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function toCard(ranked: RankedEpisode, show: Show | undefined, pair: LanguagePair): EpisodeCard {
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
    description: pick(episode.description, pair.speaks, `Episode ${episode.id} description`),
    level: episode.profile.level,
    cefr: episode.profile.cefr,
    tocfl: episode.profile.tocfl,
    suitability: ranked.suitability,
    fitReason: ranked.reason,
    levelReason: pick(episode.profile.reason, pair.speaks, `Episode ${episode.id} profile.reason`),
    speed: formatSpeechRate(episode.profile.speechRate),
    voices: formatVoices(episode.profile.speakerCount),
    speakerCount: episode.profile.speakerCount,
    duration: formatDuration(episode.durationSeconds),
    newWords: episode.vocabulary.filter((entry) => has(entry.meaning, pair.speaks)).length,
    publisherTranscript: episode.publisherTranscript,
    ratedBy: episode.ratedBy,
    overlayVerified: episode.overlayVerified,
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

export async function loadDiscoverCatalogue(pair: LanguagePair): Promise<DiscoverCatalogue> {
  const shows = await showsById();
  const perLevel = await Promise.all(
    LEARNING_LEVELS.map(async (level) => {
      const [ranked, first] = await Promise.all([
        fetchRankedEpisodes(pair, level),
        fetchStartHere(pair, level),
      ]);
      return [
        level,
        ranked.map((item) => toCard(item, shows.get(item.episode.showId), pair)),
        first ? toCard(first, shows.get(first.episode.showId), pair) : null,
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

/**
 * Every episode id in this pair's catalogue, in the API's default ranking
 * order. Drives the static routes — and it is per pair, because an episode with
 * no layer in `speaks` has no page under that pair at all.
 */
export async function loadEpisodeIds(pair: LanguagePair): Promise<string[]> {
  const ranked = await fetchRankedEpisodes(pair);
  return ranked.map((item) => item.episode.id);
}

export async function loadEpisodeDetail(
  pair: LanguagePair,
  id: string,
): Promise<EpisodeDetail | null> {
  const episode = await fetchEpisode(pair, id);
  if (!episode) return null;

  const shows = await showsById();
  const show = shows.get(episode.showId);

  // The card fields need the ranked view, so take this episode's entry from the
  // list ranked for its own level — that is the reader looking at this page.
  const ranked = await fetchRankedEpisodes(pair, episode.profile.level);
  const entry = ranked.find((item) => item.episode.id === id);
  if (!entry) {
    throw new Error(`Episode ${id} exists but is absent from the ${episode.profile.level} ranking`);
  }

  // Neighbours come from the full ordering, not from id arithmetic: ids are
  // opaque strings from the API and will not stay contiguous after ingestion.
  // Within this pair, too: a pair with one episode links back to itself rather
  // than to a page that does not exist under it.
  const order = await loadEpisodeIds(pair);
  const index = order.indexOf(id);
  const previousId = order[(index - 1 + order.length) % order.length];
  const nextId = order[(index + 1) % order.length];

  return {
    ...toCard(entry, show, pair),
    learningGoal: pick(episode.learningGoal, pair.speaks, `Episode ${id} learningGoal`),
    audioSrc: episode.audioUrl,
    // Episode first, show second. A show's source is right only when every
    // episode under it shares one; `zh-wikipedia-spoken` is three different
    // volunteers reading three different articles, and crediting them all to
    // the first is a false attribution under CC BY-SA, not a stale link.
    sourceUrl: episode.sourceUrl ?? show?.sourceUrl,
    sourceLabel: show ? `${show.publisher} · ${episode.title}` : undefined,
    licence: episode.licence ?? show?.licence,
    audioModified: episode.audioModified ?? false,
    transcript: episode.transcript.map((cue) => ({
      time: formatCueTime(cue.startMs),
      seconds: Math.round(cue.startMs / 1000),
      speaker: cue.speaker,
      text: cue.text,
      translation: pickOptional(cue.translation, pair.speaks),
      highlight: cue.highlight,
    })),
    vocabulary: episode.vocabulary
      .filter((entry_) => has(entry_.meaning, pair.speaks))
      .map((entry_) => ({
        term: entry_.term,
        type: entry_.partOfSpeech,
        meaning: pick(entry_.meaning, pair.speaks, `Episode ${id} vocabulary "${entry_.term}" meaning`),
        example: entry_.example,
        occurrence: findOccurrence(entry_.term, episode.transcript),
      })),
    questions: episode.questions.map((question, index) => ({
      prompt: pick(question.prompt, pair.speaks, `Episode ${id} question ${index + 1} prompt`),
      options: pick(question.options, pair.speaks, `Episode ${id} question ${index + 1} options`),
      answer: question.answerIndex,
    })),
    previousId,
    nextId,
  };
}
