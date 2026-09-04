import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  DifficultyProfile,
  Episode,
  LearningLevel,
  Show,
  TranscriptCue,
} from './catalog.types';
import type { LanguagePair, Localized } from './language.types';

/**
 * The pair this seed is written for, declared rather than assumed.
 *
 * Seven episodes with English audio and English explanations. That is
 * `en → en`, which is degenerate — it describes a catalogue that does not yet
 * do the thing the product is for — and saying so is the point. See ADR 0003,
 * decision 6.
 */
export const SEED_PAIR = { speaks: 'en', learning: 'en' } as const satisfies LanguagePair;

/**
 * Lift a flat seed string into the pair's own language.
 *
 * The seed JSON stays flat and this loader does the wrapping. Nesting the JSON
 * would rewrite seventy-odd rows to say what one constant already says, and it
 * would say it once per row — seven chances to disagree with itself. A second
 * language arrives as its own overlay file keyed by episode id, not by editing
 * this one; that path is designed for, not built, and it will need writing
 * properly the first time it is exercised.
 */
function authoredInSeedLanguage<T>(value: T): Localized<T> {
  return { [SEED_PAIR.speaks]: value };
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
  title: string;
  author: string;
  topic: string;
  duration: string;
  episode: string;
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
  verifiedLesson?: boolean;
  transcript: { time: string; seconds?: number; speaker?: string; text: string; highlight?: string }[];
  vocabulary: { term: string; type: string; meaning: string; example: string }[];
  questions: { prompt: string; options: string[]; answer: number }[];
}

const SEED_PATH = join(__dirname, 'data', 'catalog.seed.json');

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseSpeechRate(speed: string): number {
  const match = /(\d+)/.exec(speed);
  return match ? Number(match[1]) : 0;
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
function buildProfile(row: SeedRow): DifficultyProfile {
  const speakers = new Set(row.transcript.map((cue) => cue.speaker).filter(Boolean));
  const coverageByLevel: Record<LearningLevel, number> = {
    Beginner: 0.95,
    Intermediate: 0.88,
    Advanced: 0.78,
  };

  return {
    speechRate: parseSpeechRate(row.speed),
    vocabularyCoverage: coverageByLevel[row.level],
    speakerCount: Math.max(1, speakers.size),
    slangLoad: row.level === 'Advanced' ? 0.5 : row.level === 'Intermediate' ? 0.25 : 0.1,
    accentLoad: 0.2,
    level: row.level,
    cefr: row.cefr,
    reason: authoredInSeedLanguage(row.levelReason),
  };
}

export function loadSeedCatalog(): { shows: Show[]; episodes: Episode[] } {
  const rows = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as SeedRow[];

  const shows = new Map<string, Show>();
  const episodes: Episode[] = [];

  for (const row of rows) {
    const showId = slug(row.title);
    const profile = buildProfile(row);

    if (!shows.has(showId)) {
      shows.set(showId, {
        id: showId,
        title: row.title,
        publisher: row.author,
        language: SEED_PAIR.learning,
        topics: [row.topic, ...row.tags],
        description: row.description,
        profile,
        sourceUrl: row.sourceUrl,
      });
    }

    const transcript: TranscriptCue[] = row.transcript.map((cue) => ({
      startMs: timeToMs(cue),
      speaker: cue.speaker,
      text: cue.text,
      highlight: cue.highlight,
    }));

    episodes.push({
      id: String(row.id),
      showId,
      title: row.episode,
      description: row.description,
      durationSeconds: parseDurationSeconds(row.duration),
      audioUrl: row.audioSrc,
      publisherTranscript: row.verifiedLesson === true,
      learningGoal: authoredInSeedLanguage(row.learningGoal),
      newWordCount: row.newWords,
      profile,
      transcript,
      vocabulary: row.vocabulary.map((entry) => ({
        term: entry.term,
        partOfSpeech: entry.type,
        meaning: authoredInSeedLanguage(entry.meaning),
        example: entry.example,
      })),
      questions: row.questions.map((question) => ({
        prompt: authoredInSeedLanguage(question.prompt),
        options: authoredInSeedLanguage(question.options),
        answerIndex: question.answer,
      })),
    });
  }

  return { shows: [...shows.values()], episodes };
}
