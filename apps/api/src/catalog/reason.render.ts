/**
 * The ranked reason, rendered per learner language.
 *
 * This was one English template string until the first non-English pair
 * arrived, and it could not survive the move. The English version inflects
 * plurals ("1 minute" / "2 minutes"), orders its clauses as English does, and
 * ends in a full stop; Chinese has no plural inflection, counts with measure
 * words, and its full stop is a different character. A format string with the
 * numbers substituted in produces half a sentence in each language.
 *
 * So the shape here is a function per language over the same facts, not one
 * template with holes. Adding a language means writing a sentence in it, which
 * is the honest amount of work.
 *
 * `RENDERERS` is `Partial`, and `zh-Hans` deliberately has no entry. There is
 * no Simplified Chinese content in this catalogue, and a renderer for it would
 * be the one component willing to speak a language the catalogue cannot — the
 * exact fallback ADR 0003 rules out. An unsupported language throws.
 */

import type { LanguageTag } from './language.types';
import type { SpeechRate } from './speech-rate';

/**
 * What a reason is composed from. Everything measured, plus `authored` — the
 * profile's own sentence, already fetched in the target language by the caller.
 */
export interface ReasonFacts {
  durationSeconds: number;
  speakerCount: number;
  /**
   * Carries its unit, and each renderer has to say which unit it is naming.
   * The unit belongs to the audio's language and the sentence belongs to the
   * learner's, so this is the one fact here that crosses the pair.
   */
  speechRate: SpeechRate;
  /** True when the episode's speech rate is inside this learner's comfort. */
  comfortable: boolean;
  /** The authored level reason, in the language being rendered. */
  authored: string;
}

type Renderer = (facts: ReasonFacts) => string;

const RENDERERS: Partial<Record<LanguageTag, Renderer>> = {
  en: (facts) => {
    // floor, not round: a 30-second episode rounds up to "1 minutes", which is
    // both the wrong number and the wrong plural.
    const minutes = Math.floor(facts.durationSeconds / 60);
    const length =
      minutes >= 1
        ? `${minutes} minute${minutes === 1 ? '' : 's'}`
        : `${facts.durationSeconds} seconds`;
    const voices = facts.speakerCount === 1 ? 'one voice' : `${facts.speakerCount} voices`;
    const pace = facts.comfortable ? 'at a pace you can follow' : 'faster than your usual pace';

    return `${length}, ${voices}, ${facts.speechRate.value} ${facts.speechRate.unit} — ${pace}. ${facts.authored}.`;
  },

  'zh-Hant': (facts) => {
    const minutes = Math.floor(facts.durationSeconds / 60);
    const length = minutes >= 1 ? `${minutes} 分鐘` : `${facts.durationSeconds} 秒`;
    // 一個人聲 / 3 個人聲: the count word is spelled out at one and left as a
    // numeral above it, the way a Chinese sentence actually reads.
    const voices = facts.speakerCount === 1 ? '一個人聲' : `${facts.speakerCount} 個人聲`;
    const pace = facts.comfortable ? '這個語速你跟得上' : '比你平常聽的速度快';
    // 詞 for words, 字 for characters. English "105 wpm" and Mandarin "240 cpm"
    // both become 「每分鐘 N …」 in Chinese, and only the counter distinguishes
    // them — which is the distinction a bare number could not carry at all.
    const counter = facts.speechRate.unit === 'wpm' ? '個詞' : '個字';

    // The authored half gets no punctuation appended — it is a Chinese clause
    // and ends in 。 of its own. Appending "." here is precisely the bug that
    // made a template string the wrong tool.
    return `${length},${voices},每分鐘 ${facts.speechRate.value} ${counter}——${pace}。${facts.authored}。`;
  },
};

export function renderReason(speaks: LanguageTag, facts: ReasonFacts): string {
  const render = RENDERERS[speaks];
  if (!render) {
    throw new Error(
      `No reason renderer for ${speaks}. A ranked episode must say why it ranks ` +
        'there, in the reader\'s language — write the renderer, do not fall back.',
    );
  }
  return render(facts);
}

/** Whether a language can be rendered at all. Used to filter the catalogue. */
export function canRenderReason(speaks: LanguageTag): boolean {
  return RENDERERS[speaks] !== undefined;
}
