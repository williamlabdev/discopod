import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { applyOverlays } from './catalog.overlay';
import type {
  DifficultyProfile,
  Episode,
  LearningLevel,
  Show,
  TranscriptCue,
} from './catalog.types';
import { spokenLanguageOf, type LanguagePair, type Localized } from './language.types';
import { rateUnitFor, type SpeechRate } from './speech-rate';

/**
 * The pair this seed is written for, declared rather than assumed.
 *
 * English audio with English explanations. That is `en → en`, and it is a
 * statement about *authorship* — what language the strings in this file are
 * written in — not a pair the site serves. It stopped being one in ADR 0012:
 * `listPairs` excludes any pair whose two sides match. These rows still matter,
 * because they are what `catalog.zh-Hant.json` was translated from, and that
 * overlay is what raises the pair a Chinese speaker learning English reads.
 *
 * The seed is one episode, and that is the whole catalogue of verified
 * material. It held seven until the six unverified rows were removed: they
 * carried invented episode titles and invented transcripts under the names of
 * real publishers, which is not demo data but fabricated attribution. See
 * ADR 0004.
 */
export const SEED_PAIR = { speaks: 'en', learning: 'en' } as const satisfies LanguagePair;

/**
 * Every seed file, each carrying the pair it is written in.
 *
 * This is the "second script arrives as its own file, not as a column" note
 * below, built. The rows stay flat — a row still says nothing about what
 * language it is in — but the constant that answers that question is now per
 * file instead of per module, so a Mandarin seed is a new entry here and a new
 * JSON file, and it changes nothing about the English one.
 *
 * The alternative was a `language` column on every row. That is one chance per
 * row for the data to contradict itself, and the contradiction would be silent:
 * a row mislabelled `en` in a Mandarin file gets English thresholds applied to a
 * character count and produces a suitability score that is precise and false.
 * A file cannot be in two languages, so the file is where the claim belongs.
 */
interface SeedFile {
  pair: LanguagePair;
  /** Relative to `data/`, so the `assets` glob in nest-cli.json carries it. */
  file: string;
}

/**
 * One entry per pair the seeds serve.
 *
 * Named by pair, not by language, because that is what a seed file is: a
 * catalogue for one `speaks → learning` combination. The distinction earns its
 * awkwardness next to `catalog.zh-Hant.json`, which sits in the same directory
 * and is named for a single language — that one is an *overlay*, a zh-Hant
 * explanatory layer over episodes in some other language, and it is the other
 * axis entirely. `catalog.zh-Hant.seed.json` would have differed from it by
 * four characters while meaning something unrelated.
 *
 * `catalog.seed.json` keeps its bare name: it is the base catalogue and its
 * pair is SEED_PAIR, which is the constant the rest of this file is written
 * against.
 */
const SEED_FILES: SeedFile[] = [
  { pair: SEED_PAIR, file: 'catalog.seed.json' },
  { pair: { speaks: 'en', learning: 'zh-Hant' }, file: 'catalog.en-zh-Hant.seed.json' },
];

/**
 * What a seed's audio is spoken in, derived from its pair rather than typed
 * again. `pair.learning` is the written form the transcript is in; this is the
 * sound behind it, and the two must not be able to disagree. ADR 0006.
 */
const spokenOf = (pair: LanguagePair) => spokenLanguageOf(pair.learning);

/**
 * Lift a flat seed string into its file's own language.
 *
 * The seed JSON stays flat and this loader does the wrapping. Nesting the JSON
 * would rewrite every row to say what one constant already says, and it would
 * say it once per row — one chance per row to disagree with itself. A second
 * language arrives as its own overlay file keyed by episode id, not by editing
 * this one; see catalog.overlay.ts, which is that path built.
 */
function authoredIn<T>(pair: LanguagePair, value: T): Localized<T> {
  return { [pair.speaks]: value };
}

/**
 * Shape of the legacy demo catalogue that shipped inside the web app.
 * Kept as a seed so the API has real content before ingestion exists.
 *
 * Deliberately flat: every string here is in one of the two languages of
 * SEED_PAIR, and which one it is, is a property of the field, not of the row.
 */
interface SeedRow {
  id: number;
  /**
   * The show's id, given rather than derived, for shows whose title cannot
   * produce one.
   *
   * `slug()` keeps `[a-z0-9]` and drops everything else, which is the right
   * answer for a Latin title and returns the empty string for a Chinese one.
   * The alternatives were both worse: transliterating 中文维基百科有声条目 into
   * pinyin is a guess of exactly the kind ADR 0006 forbids for scripts, and
   * hashing the title produces an id no human can read in a URL or a palette
   * key. So the id becomes data for the seeds that need it, and stays derived
   * for the one that already works — an omitted `showId` is not a defect.
   *
   * Ids are also the join between the API and the web app's palette table, so
   * deriving them from prose was always fragile: retitling a show would have
   * silently moved every episode to a new id. Naming it here is the fix for
   * that too, and the reason this is a field rather than a special case inside
   * `slug()`.
   */
  showId?: string;
  title: string;
  author: string;
  topic: string;
  duration: string;
  episode: string;
  /**
   * Flat here like every other seed string, and lifted into the file's
   * `speaks` language by `authoredIn`. It reaches `Episode.description` as
   * `Localized` and `Show.description` as a scalar; both of those fields carry
   * the reasoning for their side of that split.
   */
  description: string;
  tags: string[];
  level: LearningLevel;
  cefr: string;
  speed: string;
  newWords: number;
  levelReason: string;
  learningGoal: string;
  audioSrc?: string;
  sourceUrl?: string;
  licence?: { name: string; url: string };
  /** Absent means the publisher's file ships unchanged. See `Episode.audioModified`. */
  audioModified?: boolean;
  verifiedLesson?: boolean;
  transcript: { time: string; seconds?: number; speaker?: string; text: string; highlight?: string }[];
  vocabulary: { term: string; type: string; meaning: string; example: string }[];
  questions: { prompt: string; options: string[]; answer: number }[];
}

const seedPath = (file: string) => join(__dirname, 'data', file);

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The seed writes rates as display strings ("≈ 105 wpm"). The number is parsed
 * out of it, but the unit is taken from the spoken language rather than from
 * the string: the string is authored prose and can disagree with itself, while
 * the language is the fact that decides what was counted. See speech-rate.ts.
 */
function parseSpeechRate(speed: string, pair: LanguagePair): SpeechRate {
  const match = /(\d+)/.exec(speed);
  return { value: match ? Number(match[1]) : 0, unit: rateUnitFor(spokenOf(pair)) };
}

function parseDurationSeconds(duration: string): number {
  const minutes = /(\d+)\s*min/i.exec(duration);
  if (minutes) return Number(minutes[1]) * 60;
  const seconds = /(\d+)\s*sec/i.exec(duration);
  if (seconds) return Number(seconds[1]);
  return 0;
}

function timeToMs(cue: { time: string; seconds?: number }): number {
  if (typeof cue.seconds === 'number') return cue.seconds * 1000;
  const [minutes, seconds] = cue.time.split(':').map(Number);
  return ((minutes || 0) * 60 + (seconds || 0)) * 1000;
}

/**
 * Coverage and speaker count are not in the seed data, so they are derived
 * from what is: level and the number of distinct speakers in the transcript.
 * Real values arrive with the profiling pipeline; these are honest placeholders.
 */
function buildProfile(row: SeedRow, pair: LanguagePair): DifficultyProfile {
  const speakers = new Set(row.transcript.map((cue) => cue.speaker).filter(Boolean));
  const coverageByLevel: Record<LearningLevel, number> = {
    Beginner: 0.95,
    Intermediate: 0.88,
    Advanced: 0.78,
  };

  return {
    speechRate: parseSpeechRate(row.speed, pair),
    vocabularyCoverage: coverageByLevel[row.level],
    speakerCount: Math.max(1, speakers.size),
    slangLoad: row.level === 'Advanced' ? 0.5 : row.level === 'Intermediate' ? 0.25 : 0.1,
    accentLoad: 0.2,
    level: row.level,
    cefr: row.cefr,
    reason: authoredIn(pair, row.levelReason),
  };
}

export function loadSeedCatalog(): { shows: Show[]; episodes: Episode[] } {
  const shows = new Map<string, Show>();
  const episodes = new Map<string, Episode>();

  for (const seed of SEED_FILES) {
    loadSeedFile(seed, shows, episodes);
  }

  const all = [...episodes.values()];

  // Second languages arrive here, as files keyed by episode id — never by
  // editing the rows above. Partial by design: whatever an overlay does not
  // cover is not in that pair's catalogue. See catalog.overlay.ts.
  //
  // Applied once over the merged set rather than per file, because an overlay
  // is keyed by episode id and knows nothing about which seed the episode came
  // from — that is the whole point of it being a separate layer.
  applyOverlays(all);

  return { shows: [...shows.values()], episodes: all };
}

/**
 * Read one seed file into the accumulating catalogue.
 *
 * Collisions throw. Episode ids are `String(row.id)` and every seed file's rows
 * number from 1, so a second file silently overwriting the first is not a
 * hypothetical — it is what happens by default the first time somebody adds
 * one. Two shows with the same slugged title are the same failure a level up.
 *
 * Loud rather than absent, and the distinction is ADR 0006 decision 6's: an
 * exclusion is for content we honestly do not have, and this is content that
 * disagrees with itself about which episode it is. Nobody should have to
 * discover it by noticing an episode rendering in the wrong language.
 */
function loadSeedFile(
  seed: SeedFile,
  shows: Map<string, Show>,
  episodes: Map<string, Episode>,
): void {
  const { pair, file } = seed;
  const rows = JSON.parse(readFileSync(seedPath(file), 'utf8')) as SeedRow[];

  for (const row of rows) {
    const showId = row.showId ?? slug(row.title);
    if (!showId) {
      throw new Error(
        `Seed ${file} has a show "${row.title}" whose title slugs to nothing, so it has no ` +
          `id. That happens whenever the title is written in a non-Latin script; give the ` +
          `row an explicit "showId".`,
      );
    }
    const profile = buildProfile(row, pair);

    const existing = shows.get(showId);
    if (existing && existing.language !== spokenOf(pair)) {
      throw new Error(
        `Seed ${file} has a show "${row.title}" whose id (${showId}) is already taken by a ` +
          `${existing.language} show. Two different shows cannot share an id; rename one.`,
      );
    }
    if (!existing) {
      shows.set(showId, {
        id: showId,
        title: row.title,
        publisher: row.author,
        language: spokenOf(pair),
        topics: [row.topic, ...row.tags],
        description: row.description,
        profile,
        sourceUrl: row.sourceUrl,
        licence: row.licence,
      });
    }

    const transcript: TranscriptCue[] = row.transcript.map((cue) => ({
      startMs: timeToMs(cue),
      speaker: cue.speaker,
      text: cue.text,
      highlight: cue.highlight,
    }));

    const id = String(row.id);
    if (episodes.has(id)) {
      throw new Error(
        `Seed ${file} reuses episode id ${id}, which another seed file already claimed. ` +
          `Episode ids are global; give each seed file its own range.`,
      );
    }

    episodes.set(id, {
      id,
      showId,
      title: row.episode,
      description: authoredIn(pair, row.description),
      durationSeconds: parseDurationSeconds(row.duration),
      audioUrl: row.audioSrc,
      publisherTranscript: row.verifiedLesson === true,
      learningGoal: authoredIn(pair, row.learningGoal),
      newWordCount: row.newWords,
      profile,
      // The seed rows are flat and single-script by construction, so this comes
      // from the file's pair like every other language fact here rather than
      // from a per-row field nobody would keep correct. A second script arrives
      // the way a second language does — as its own file, not as a column.
      transcriptLanguage: pair.learning,
      // Per episode, not only per show. The show gets these from whichever row
      // claimed its id first, which is a false credit for every other row under
      // it — see the field comment on `Episode.sourceUrl`.
      sourceUrl: row.sourceUrl,
      licence: row.licence,
      audioModified: row.audioModified,
      transcript,
      vocabulary: row.vocabulary.map((entry) => ({
        term: entry.term,
        partOfSpeech: entry.type,
        meaning: authoredIn(pair, entry.meaning),
        example: entry.example,
      })),
      questions: row.questions.map((question) => ({
        prompt: authoredIn(pair, question.prompt),
        options: authoredIn(pair, question.options),
        answerIndex: question.answer,
      })),
    });
  }
}
