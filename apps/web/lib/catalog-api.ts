/**
 * HTTP client for @discopod/api's catalogue.
 *
 * These types mirror `apps/api/src/catalog/catalog.types.ts`. They are declared
 * again here on purpose rather than imported across the workspace: the contract
 * between the two apps is HTTP, and the web app must keep building if the API is
 * deployed from a different commit. `assertEpisode` is what stops that freedom
 * from turning into silently blank pages — a shape change fails the build with
 * the offending id, instead of rendering an episode with no transcript.
 *
 * Every call happens at build time. See `scripts/build.mjs` for where
 * CATALOG_API_URL comes from.
 */

import { ACTIVE_PAIR, has, type LanguageTag, type Localized } from './language';

export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface DifficultyProfile {
  speechRate: number;
  vocabularyCoverage: number;
  speakerCount: number;
  slangLoad: number;
  accentLoad: number;
  level: LearningLevel;
  cefr: string;
  /** Plain-language reason, shown to the learner. Never rank without one. */
  reason: Localized;
}

export interface Show {
  id: string;
  title: string;
  publisher: string;
  language: LanguageTag;
  topics: string[];
  description: string;
  profile: DifficultyProfile;
  sourceUrl?: string;
}

export interface TranscriptCue {
  startMs: number;
  endMs?: number;
  speaker?: string;
  text: string;
  translation?: Localized;
  highlight?: string;
}

export interface VocabularyEntry {
  term: string;
  partOfSpeech: string;
  meaning: Localized;
  example: string;
}

export interface ComprehensionQuestion {
  prompt: Localized;
  options: Localized<string[]>;
  answerIndex: number;
}

export interface Episode {
  id: string;
  showId: string;
  title: string;
  description: string;
  durationSeconds: number;
  audioUrl?: string;
  publisherTranscript: boolean;
  learningGoal: Localized;
  newWordCount: number;
  profile: DifficultyProfile;
  transcript: TranscriptCue[];
  vocabulary: VocabularyEntry[];
  questions: ComprehensionQuestion[];
}

export interface RankedEpisode {
  episode: Episode;
  /** 0-100, computed by the API. Never stored, never authored by hand. */
  suitability: number;
  /** Why this ranks here, in the learner's words. The product invariant. */
  reason: string;
}

/** Where `npm run dev --workspace @discopod/api` listens. */
const DEV_FALLBACK = 'http://127.0.0.1:3001/api';

function baseUrl(): string {
  const configured = process.env.CATALOG_API_URL;
  if (configured) return configured.replace(/\/$/, '');

  // `next dev` against the API from `npm run dev` needs no configuration.
  // A build sets NODE_ENV=production, so it never lands on this fallback.
  if (process.env.NODE_ENV !== 'production') return DEV_FALLBACK;

  throw new Error(
    'CATALOG_API_URL is not set. The web app fetches its catalogue from ' +
      '@discopod/api at build time — run `npm run build --workspace @discopod/web`, ' +
      'which starts an API for the build, or point CATALOG_API_URL at a running one.',
  );
}

async function get<T>(path: string): Promise<T> {
  const url = `${baseUrl()}${path}`;
  let response: Response;

  try {
    // force-cache so the build fetches each URL once, however many routes ask.
    response = await fetch(url, { cache: 'force-cache' });
  } catch (cause) {
    throw new Error(`Catalogue API unreachable at ${url}`, { cause });
  }

  if (!response.ok) {
    throw new Error(`Catalogue API answered ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

/**
 * Fail loudly on a contract change. Everything checked here is something a
 * page renders; an episode missing any of it is a broken page, and a broken
 * build is the cheaper way to find that out.
 *
 * The `Localized` fields are checked for the *active pair's* language, not for
 * mere presence. An episode carrying a reason in some language, but not in the
 * one this build renders, has nothing to say to this learner — ADR 0003 calls
 * that exclusion from the pair's catalogue, and this is where it is enforced.
 * Right now it can only fire on a drifted API, because the pair is `en → en`
 * and the seed authors every field; it is written for the pair after that.
 */
function assertEpisode(episode: Episode, where: string): Episode {
  const problems: string[] = [];

  if (!episode?.id) problems.push('id');
  if (!episode?.showId) problems.push('showId');
  if (!has(episode?.profile?.reason)) problems.push(`profile.reason[${ACTIVE_PAIR.speaks}]`);
  if (!episode?.profile?.level) problems.push('profile.level');
  if (!has(episode?.learningGoal)) problems.push(`learningGoal[${ACTIVE_PAIR.speaks}]`);
  if (!Array.isArray(episode?.transcript) || episode.transcript.length === 0) {
    problems.push('transcript');
  }

  if (!Array.isArray(episode?.vocabulary)) {
    problems.push('vocabulary');
  } else {
    const untranslated = episode.vocabulary.filter((entry) => !has(entry.meaning));
    if (untranslated.length > 0) {
      problems.push(
        `${untranslated.length} vocabulary meaning(s) with no ${ACTIVE_PAIR.speaks}: ` +
          untranslated.map((entry) => entry.term).join(', '),
      );
    }
  }

  if (!Array.isArray(episode?.questions)) {
    problems.push('questions');
  } else if (episode.questions.some((q) => !has(q.prompt) || !has(q.options))) {
    problems.push(`question prompt/options with no ${ACTIVE_PAIR.speaks}`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Episode ${episode?.id ?? '(no id)'} from ${where} is missing: ${problems.join('; ')}`,
    );
  }

  return episode;
}

function assertRanked(ranked: RankedEpisode, where: string): RankedEpisode {
  // The vision's one hard rule: nothing is ranked without saying why.
  if (!ranked?.reason) {
    throw new Error(`Ranked episode ${ranked?.episode?.id ?? '(no id)'} from ${where} has no reason`);
  }
  assertEpisode(ranked.episode, where);
  return ranked;
}

export async function fetchShows(): Promise<Show[]> {
  return get<Show[]>('/shows');
}

/**
 * Ranked episodes. With a level, the API filters to that level *and* scores for
 * it — the same episode is a different fit for a different learner, so the level
 * has to go to the server rather than being filtered off afterwards.
 */
export async function fetchRankedEpisodes(level?: LearningLevel): Promise<RankedEpisode[]> {
  const where = level ? `/episodes?level=${level}` : '/episodes';
  const ranked = await get<RankedEpisode[]>(where);
  return ranked.map((item) => assertRanked(item, where));
}

/**
 * The single "start here" pick for a level, with its reasoning. Returns null
 * only for an empty catalogue — a level with no episodes of its own falls back
 * to the best episode overall, still scored for this learner.
 */
export async function fetchStartHere(level: LearningLevel): Promise<RankedEpisode | null> {
  const where = `/episodes/start-here?level=${level}`;
  const ranked = await get<RankedEpisode | null>(where);
  return ranked ? assertRanked(ranked, where) : null;
}

export async function fetchEpisode(id: string): Promise<Episode | null> {
  const url = `${baseUrl()}/episodes/${encodeURIComponent(id)}`;
  const response = await fetch(url, { cache: 'force-cache' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Catalogue API answered ${response.status} for ${url}`);
  return assertEpisode((await response.json()) as Episode, `/episodes/${id}`);
}
