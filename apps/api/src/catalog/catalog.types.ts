import type { LanguageTag, Localized, SpokenLanguage } from './language.types';
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
   * What is spoken in the audio. A fact about the show, not a request.
   *
   * Deliberately not a `LanguageTag`: a script is a property of a transcript,
   * and this field is about sound. Typing it as one forced a Mandarin show to
   * declare itself traditional *or* simplified in order to exist, which then
   * decided which learners could reach it — on the basis of a writing system
   * nobody can hear. One Mandarin show is one row here; which scripts it can
   * actually be read in is answered per episode by `transcriptLanguage`.
   * ADR 0006.
   */
  language: SpokenLanguage;
  topics: string[];
  /**
   * Scalar, unlike `Episode.description`, and the asymmetry is deliberate.
   *
   * The same argument applies — a show blurb is read before listening, so it
   * belongs in the learner's language — but nothing reads this field: it is not
   * rendered, not in `toCard`, and not in the search haystack, which spans
   * `episode.description` only. More to the point, overlays are keyed by
   * episode id, so a show has no path by which a second language could ever be
   * supplied. Typing it `Localized` would produce a field with exactly one key,
   * forever, and a `pick()` on it would exclude every non-English learner the
   * first time somebody rendered it.
   *
   * So it stays scalar until a show blurb has both a reader and a way to be
   * translated. Whoever gives it the first, give it the second in the same
   * change.
   */
  description: string;
  profile: DifficultyProfile;
  sourceUrl?: string;
  /**
   * The terms this show's audio is used under, carried so the page can name
   * them rather than gesture at them.
   *
   * A link to the source credits the author; it does not state a licence, and
   * under a share-alike licence those are two separate obligations. Under
   * CC BY-SA, naming the licence is a condition of using the audio at all — so
   * it is data about the show, not decoration on a page.
   *
   * Optional, because "no licence named" and "public domain" are different
   * answers and neither should be invented. A show without this renders the
   * credit line it always rendered.
   */
  licence?: { name: string; url: string };
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
  /**
   * What the episode is about, in the learner's own language.
   *
   * ADR 0003 decision 2 originally classified this as scalar, in the *show's*
   * language, and that was wrong in a way no `en → en` catalogue could reveal.
   * A description is read *before* listening, by a learner who by definition
   * cannot yet follow the audio; writing it in the language being learned hands
   * the one sentence that decides "is this for me?" to the one person who
   * cannot read it. See ADR 0010.
   */
  description: Localized;
  durationSeconds: number;
  audioUrl?: string;
  /** True when the audio and transcript come from the publisher, not from our own ASR. */
  publisherTranscript: boolean;
  /** What the learner should take away. Their language, so keyed. */
  learningGoal: Localized;
  newWordCount: number;
  profile: DifficultyProfile;
  /**
   * The written form `transcript[].text` is actually in, and so the `learning`
   * side of every pair this episode can be served under.
   *
   * Scalar, because the transcript is: one episode carries one transcript, in
   * one script. A Mandarin episode with a traditional transcript is in
   * `en → zh-Hant` and not in `en → zh-Hans`, and that absence is honest — the
   * simplified transcript does not exist. It is not produced by converting the
   * traditional one; see `writtenFormsOf` for why that conversion is a guess.
   *
   * Its spoken language must be the show's. Nothing here enforces that — the
   * seed loader and `CatalogService.listPairs` do, loudly.
   */
  transcriptLanguage: LanguageTag;
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
  /**
   * The written form the learner is here to read — the pair's `learning` side,
   * matched against `Episode.transcriptLanguage`. Where `speaks` selects which
   * *explanations* exist, this selects which *content* is being asked for, so
   * the two filters are about different halves of the same episode.
   *
   * Omitted means `DEFAULT_PAIR.learning`, symmetrically with `speaks`. It is
   * deliberately not "no filter": before this existed, a client that did not
   * ask got every episode in every target language, which is how the first
   * Mandarin episode would have appeared on the `en → en` page. ADR 0006
   * predicted that and left it unfixed while every episode was English.
   */
  learning?: LanguageTag;
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
