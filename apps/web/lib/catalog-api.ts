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
  reason: string;
}

export interface Show {
  id: string;
  title: string;
  publisher: string;
  language: string;
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
  translation?: string;
  highlight?: string;
}

export interface VocabularyEntry {
  term: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
}

export interface ComprehensionQuestion {
  prompt: string;
  options: string[];
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
  learningGoal: string;
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
 */
function assertEpisode(episode: Episode, where: string): Episode {
  const problems: string[] = [];

  if (!episode?.id) problems.push('id');
  if (!episode?.showId) problems.push('showId');
  if (!episode?.profile?.reason) problems.push('profile.reason');
  if (!episode?.profile?.level) problems.push('profile.level');
  if (!Array.isArray(episode?.transcript) || episode.transcript.length === 0) {
    problems.push('transcript');
  }
  if (!Array.isArray(episode?.vocabulary)) problems.push('vocabulary');
  if (!Array.isArray(episode?.questions)) problems.push('questions');

  if (problems.length > 0) {
    throw new Error(
      `Episode ${episode?.id ?? '(no id)'} from ${where} is missing: ${problems.join(', ')}`,
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

export async function fetchEpisode(id: string): Promise<Episode | null> {
  const url = `${baseUrl()}/episodes/${encodeURIComponent(id)}`;
  const response = await fetch(url, { cache: 'force-cache' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Catalogue API answered ${response.status} for ${url}`);
  return assertEpisode((await response.json()) as Episode, `/episodes/${id}`);
}
