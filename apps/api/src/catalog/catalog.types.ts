export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';

/**
 * The facts that decide whether a learner can follow an episode by ear.
 * This is the ranking substrate for the whole product: everything the app
 * surfaces about a show leads with these, not with recency or chart position.
 */
export interface DifficultyProfile {
  /** Words per minute of running speech. */
  speechRate: number;
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
  /** Plain-language reason, shown to the learner. Never rank without one. */
  reason: string;
}

export interface Show {
  id: string;
  title: string;
  publisher: string;
  /** BCP-47 tag of the spoken language. */
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
  /** Native-language rendering; the learner can switch this whole side off. */
  translation?: string;
  /** The phrase carrying the meaning, highlighted together with the active word. */
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
  /** True when the audio and transcript come from the publisher, not from our own ASR. */
  publisherTranscript: boolean;
  learningGoal: string;
  newWordCount: number;
  profile: DifficultyProfile;
  transcript: TranscriptCue[];
  vocabulary: VocabularyEntry[];
  questions: ComprehensionQuestion[];
}

export interface EpisodeQuery {
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
  reason: string;
}
