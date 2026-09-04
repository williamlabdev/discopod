/**
 * Second-language layers over the seed catalogue.
 *
 * The seed is flat and `en → en` (see catalog.seed.ts). A learner whose own
 * language is not English needs the *explanatory* half of an episode written in
 * theirs: the blurb that decides whether they open it at all, the level reason,
 * the learning goal, the vocabulary glosses, the comprehension prompts, and a
 * translation under each transcript cue. The
 * show's own half — title, transcript text, the terms themselves, the examples
 * — is the material being learned and stays in the show's language, which is
 * why one English episode can serve every native language at once. ADR 0003.
 *
 * An overlay is a file per learner language, keyed by episode id. Partial on
 * purpose: an episode with no entry is simply *not in that pair's catalogue*,
 * and CatalogService filters it out rather than falling back to English. That
 * exclusion is the whole design, so the loader must not paper over it.
 *
 * ## File shape
 *
 * ```json
 * {
 *   "<episode id>": {
 *     "levelReason":  "...",              // profile.reason
 *     "learningGoal": "...",
 *     "description":  "...",              // the blurb, read before listening
 *     "transcript":   { "MM:SS": "..." }, // keyed by the seed's cue time
 *     "vocabulary":   { "<term>": "..." },// keyed by the English term
 *     "questions": [                      // positional, in seed order
 *       { "sourcePrompt": "<the exact English prompt>", "prompt": "...", "options": [...] }
 *     ]
 *   }
 * }
 * ```
 *
 * Cues and vocabulary key off something stable and human-readable in the seed,
 * so a translator can see what they are translating. Questions have no such
 * anchor — they are a positional array — so each entry repeats the English
 * prompt it is attached to and the loader asserts it still matches. Reorder or
 * reword a question in the seed and the build fails naming the episode, instead
 * of quietly serving question 2's Chinese under question 3.
 *
 * ## Deliberately not translated
 *
 * Episode 7's third question asks *which English phrase* the speakers used, so
 * its options are the three English phrases and stay English in the zh-Hant
 * layer. They are the material, not the explanation. `ComprehensionQuestion`
 * types options as `Localized<string[]>` and so permits it, but the first
 * episode of the first second language already shows that today's quiz mixes
 * both halves in one field — the exercise redesign ADR 0003 declined to
 * pre-empt. Recorded here as evidence for whoever picks that up.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Episode } from './catalog.types';
import type { LanguageTag } from './language.types';

interface OverlayQuestion {
  /** The seed's English prompt, repeated so a drifted seed fails loudly. */
  sourcePrompt: string;
  prompt: string;
  options: string[];
}

interface OverlayEpisode {
  levelReason: string;
  learningGoal: string;
  /**
   * The episode blurb. Required, and required for a sharper reason than the
   * other fields: this is the sentence a learner reads to decide whether to
   * open the episode at all, so an episode offered in a pair whose description
   * is missing is one the learner cannot choose. See ADR 0010.
   */
  description: string;
  /** Keyed by the seed cue's `time` ("00:07"). Cues may be partially covered. */
  transcript?: Record<string, string>;
  /** Keyed by the seed's `term`. Every term must be present — see apply(). */
  vocabulary: Record<string, string>;
  questions: OverlayQuestion[];
}

type OverlayFile = Record<string, OverlayEpisode>;

/**
 * The languages with an overlay on disk. `en` is not here: it is the seed's own
 * language and is applied by the loader, not by a file.
 */
const OVERLAY_LANGUAGES = ['zh-Hant'] as const satisfies readonly LanguageTag[];

function overlayPath(language: LanguageTag): string {
  return join(__dirname, 'data', `catalog.${language}.json`);
}

function cueTime(startMs: number): string {
  const total = Math.round(startMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Write one episode's layer into the (already built) episode, in place.
 *
 * Every assertion here is about a *complete* layer. A half-translated episode
 * is worse than an untranslated one: it renders as Chinese with English holes
 * in it, and the learner cannot tell whether the hole is a mistake or a word
 * that has no translation. So an incomplete layer is a failed load, and the
 * honest way to publish nine tenths of an episode is to not publish it.
 */
function apply(episode: Episode, layer: OverlayEpisode, language: LanguageTag): void {
  const where = `catalog.${language}.json episode ${episode.id}`;

  // A new profile object, not a mutated one: the seed hands the *same* profile
  // to the episode and to its show, and a show's profile summarises the show,
  // not whichever of its episodes happened to get translated first.
  episode.profile = {
    ...episode.profile,
    reason: { ...episode.profile.reason, [language]: layer.levelReason },
  };
  episode.learningGoal = { ...episode.learningGoal, [language]: layer.learningGoal };
  episode.description = { ...episode.description, [language]: layer.description };

  for (const entry of episode.vocabulary) {
    const meaning = layer.vocabulary[entry.term];
    if (meaning === undefined) {
      throw new Error(`${where}: no ${language} meaning for vocabulary term "${entry.term}"`);
    }
    entry.meaning = { ...entry.meaning, [language]: meaning };
  }

  if (layer.questions.length !== episode.questions.length) {
    throw new Error(
      `${where}: ${layer.questions.length} questions, but the seed has ${episode.questions.length}`,
    );
  }

  episode.questions = episode.questions.map((question, index) => {
    const translated = layer.questions[index];
    const source = question.prompt.en;
    if (translated.sourcePrompt !== source) {
      throw new Error(
        `${where}: question ${index + 1} is attached to "${translated.sourcePrompt}", ` +
          `but the seed's question ${index + 1} is "${source ?? '(no English prompt)'}". ` +
          'The seed was reordered or reworded — re-anchor the overlay before trusting it.',
      );
    }
    if (translated.options.length !== question.options.en?.length) {
      throw new Error(
        `${where}: question ${index + 1} has ${translated.options.length} options, ` +
          `the seed has ${question.options.en?.length ?? 0}`,
      );
    }
    return {
      ...question,
      prompt: { ...question.prompt, [language]: translated.prompt },
      options: { ...question.options, [language]: translated.options },
    };
  });

  // Transcript translations are optional per cue: a cue of pure names or
  // numbers has nothing to translate, and a blank line under it is honest.
  // The other fields are not optional — the block above says why.
  const cues = layer.transcript;
  if (cues) {
    for (const cue of episode.transcript) {
      const translation = cues[cueTime(cue.startMs)];
      if (translation !== undefined) {
        cue.translation = { ...cue.translation, [language]: translation };
      }
    }
  }
}

/**
 * Merge every overlay on disk into the episodes, in place.
 *
 * An overlay naming an episode that does not exist is a failure, not a no-op:
 * it means an id changed under a translation that is now orphaned, and silently
 * dropping it would lose the work without saying so.
 */
export function applyOverlays(episodes: Episode[]): void {
  const byId = new Map(episodes.map((episode) => [episode.id, episode]));

  for (const language of OVERLAY_LANGUAGES) {
    const file = JSON.parse(readFileSync(overlayPath(language), 'utf8')) as OverlayFile;

    for (const [id, layer] of Object.entries(file)) {
      const episode = byId.get(id);
      if (!episode) {
        throw new Error(
          `catalog.${language}.json has a layer for episode ${id}, which is not in the seed`,
        );
      }
      apply(episode, layer, language);
    }
  }
}
