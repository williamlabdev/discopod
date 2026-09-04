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

import { has, type LanguagePair, type LanguageTag, type Localized } from './language';

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
 * The `Localized` fields are checked for the *requested* language, not for mere
 * presence. An episode carrying a reason in some language, but not in the one
 * this route renders, has nothing to say to this learner — ADR 0003 calls that
 * exclusion from the pair's catalogue. The API decides the exclusion
 * (CatalogService.speaksTo) and leaves such episodes out; this is the backstop
 * for anything that gets past it, which today means a drifted API.
 */
function assertEpisode(episode: Episode, speaks: LanguageTag, where: string): Episode {
  const problems: string[] = [];

  if (!episode?.id) problems.push('id');
  if (!episode?.showId) problems.push('showId');
  if (!has(episode?.profile?.reason, speaks)) problems.push(`profile.reason[${speaks}]`);
  if (!episode?.profile?.level) problems.push('profile.level');
  if (!has(episode?.learningGoal, speaks)) problems.push(`learningGoal[${speaks}]`);
  if (!Array.isArray(episode?.transcript) || episode.transcript.length === 0) {
    problems.push('transcript');
  }

  if (!Array.isArray(episode?.vocabulary)) {
    problems.push('vocabulary');
  } else {
    const untranslated = episode.vocabulary.filter((entry) => !has(entry.meaning, speaks));
    if (untranslated.length > 0) {
      problems.push(
        `${untranslated.length} vocabulary meaning(s) with no ${speaks}: ` +
          untranslated.map((entry) => entry.term).join(', '),
      );
    }
  }

  if (!Array.isArray(episode?.questions)) {
    problems.push('questions');
  } else if (
    episode.questions.some((q) => !has(q.prompt, speaks) || !has(q.options, speaks))
  ) {
    problems.push(`question prompt/options with no ${speaks}`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Episode ${episode?.id ?? '(no id)'} from ${where} is missing: ${problems.join('; ')}`,
    );
  }

  return episode;
}

function assertRanked(ranked: RankedEpisode, speaks: LanguageTag, where: string): RankedEpisode {
  // The vision's one hard rule: nothing is ranked without saying why.
  if (!ranked?.reason) {
    throw new Error(`Ranked episode ${ranked?.episode?.id ?? '(no id)'} from ${where} has no reason`);
  }
  assertEpisode(ranked.episode, speaks, where);
  return ranked;
}

/**
 * Every episode request carries the pair's `speaks`.
 *
 * It is not a display preference to be applied after the fact — it decides
 * which catalogue is being asked for. The API answers with the episodes that
 * have an explanatory layer in that language and leaves the rest out, so this
 * parameter is what makes an untranslated episode absent rather than half
 * rendered. ADR 0003; the API side is CatalogService.speaksTo.
 *
 * ADR 0002 rules out the *browser* calling this API, which this does not do:
 * these run during `next build`, server to server, and their answers are baked
 * into the pair's static pages.
 */
function episodesPath(
  path: string,
  speaks: LanguageTag,
  params: Record<string, string | undefined> = {},
): string {
  const query = new URLSearchParams({ speaks });
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return `${path}?${query.toString()}`;
}

/**
 * The pairs the catalogue can serve, which become the site's route subtrees.
 *
 * Asked rather than declared: the API derives them from which episodes carry
 * which language layer, so translating one more episode grows the site on the
 * next build with nothing here changing. See CatalogService.listPairs.
 */
export async function fetchPairs(): Promise<LanguagePair[]> {
  const pairs = await get<LanguagePair[]>('/pairs');
  if (pairs.length === 0) {
    throw new Error('The catalogue API serves no language pairs — there is no site to build.');
  }
  return pairs;
}

export async function fetchShows(): Promise<Show[]> {
  return get<Show[]>('/shows');
}

/**
 * Ranked episodes. With a level, the API filters to that level *and* scores for
 * it — the same episode is a different fit for a different learner, so the level
 * has to go to the server rather than being filtered off afterwards.
 */
export async function fetchRankedEpisodes(
  speaks: LanguageTag,
  level?: LearningLevel,
): Promise<RankedEpisode[]> {
  const where = episodesPath('/episodes', speaks, { level });
  const ranked = await get<RankedEpisode[]>(where);
  return ranked.map((item) => assertRanked(item, speaks, where));
}

/**
 * The single "start here" pick for a level, with its reasoning. Returns null
 * only for an empty catalogue — a level with no episodes of its own falls back
 * to the best episode overall, still scored for this learner.
 */
export async function fetchStartHere(
  speaks: LanguageTag,
  level: LearningLevel,
): Promise<RankedEpisode | null> {
  const where = episodesPath('/episodes/start-here', speaks, { level });
  const ranked = await get<RankedEpisode | null>(where);
  return ranked ? assertRanked(ranked, speaks, where) : null;
}

export async function fetchEpisode(speaks: LanguageTag, id: string): Promise<Episode | null> {
  const where = episodesPath(`/episodes/${encodeURIComponent(id)}`, speaks);
  const url = `${baseUrl()}${where}`;
  const response = await fetch(url, { cache: 'force-cache' });
  // 404 is also how the API says "not in this pair's catalogue", which is a
  // real answer rather than an error: the episode exists, not for this learner.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Catalogue API answered ${response.status} for ${url}`);
  return assertEpisode((await response.json()) as Episode, speaks, where);
}
