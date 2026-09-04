import type { LanguageTag, Localized } from './language.types';
import type { SpeechRate } from './speech-rate';

export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * The facts that decide whether a learner can follow an episode by ear.
 * This is the ranking substrate for the whole product: everything the app
 * surfaces about a show leads with these, not with recency or chart position.
 */
export interface DifficultyProfile {
  /**
   * How fast the running speech is, carrying the unit it is counted in. The
   * unit belongs to the audio's language, not the learner's — see speech-rate.ts.
   */
  speechRate: SpeechRate;
  /** Share of the running text covered by a learner at the target level (0-1). */
  vocabularyCoverage: number;
  /** How many people talk. One narrator is a different sport from four friends. */
  speakerCount: number;
  /** 0 = standard register, 1 = dense slang. */
  slangLoad: number;
  /** 0 = neutral/standard accent, 1 = deep regional. */
  accentLoad: number;
  level: LearningLevel;
  cefr: string;
  /**
   * Plain-language reason, shown to the learner. Never rank without one.
   * Written in the learner's own language, so it is keyed by that language.
   */
  reason: Localized;
}

export interface Show {
  id: string;
  title: string;
  publisher: string;
  /**
   * BCP-47 tag of the spoken language. A fact about the show, not a request:
   * a show whose language is not a pair's `learning` is simply not in that
   * pair's catalogue.
   */
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
  /**
   * Native-language rendering; the learner can switch this whole side off.
   * Optional *and* keyed: absent entirely means no cue was ever translated,
   * a missing key means not into that language.
   */
  translation?: Localized;
  /** The phrase carrying the meaning, highlighted together with the active word. */
  highlight?: string;
}

export interface VocabularyEntry {
  /** The word as it is spoken — the show's language. Shared across pairs. */
  term: string;
  partOfSpeech: string;
  /** The gloss. The learner's language, so keyed. */
  meaning: Localized;
  /** A sentence using the term, in the show's language. Shared across pairs. */
  example: string;
}

/**
 * Keyed for now, because today's questions are asked and answered in the
 * learner's language. When the quiz becomes listening practice as VISION.md:66
 * requires, the options are words the learner *heard* and belong in the show's
 * language. That is an exercise redesign, not a language decision — ADR 0003
 * deliberately does not pre-empt it.
 */
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
  /** True when the audio and transcript come from the publisher, not from our own ASR. */
  publisherTranscript: boolean;
  /** What the learner should take away. Their language, so keyed. */
  learningGoal: Localized;
  newWordCount: number;
  profile: DifficultyProfile;
  transcript: TranscriptCue[];
  vocabulary: VocabularyEntry[];
  questions: ComprehensionQuestion[];
}

export interface EpisodeQuery {
  /**
   * The learner's own language. Not a display preference: it selects which
   * catalogue is being asked for. An episode with no explanatory layer in this
   * language is not in the result at all — ADR 0003, and CatalogService.speaksTo.
   */
  speaks?: LanguageTag;
  level?: LearningLevel;
  topic?: string;
  search?: string;
  /** Ranking mode: 'suitability' (default) or 'recent'. */
  sort?: 'suitability' | 'recent';
}

export interface RankedEpisode {
  episode: Episode;
  /** 0-100. Derived, never stored — see CatalogService.scoreFor. */
  suitability: number;
  /**
   * Scalar, not `Localized`: this is composed per request in one language for
   * one reader, never authored or stored. `explain()` is still an English
   * sentence with English pluralisation — on the list, not on the bill.
   */
  reason: string;
}
