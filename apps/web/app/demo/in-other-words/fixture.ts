/**
 * Hand-authored fixture for the R24 demo. Not catalogue content.
 *
 * The catalogue's single source is `apps/api/src/catalog/data/catalog.seed.json`
 * (see CLAUDE.md), and R24's real restatements are a build artifact generated
 * into it (ADR 0005). Neither exists yet. This file is a stand-in so the three
 * rungs can be shown and argued about before the generator is written, and it
 * lives under `app/demo/` rather than in `lib/` so that nothing else can import
 * it by accident.
 *
 * The restatements below were written by hand to the spec in
 * `docs/REQUIREMENTS.md` §R24 — the hard expression kept verbatim and explained
 * in place, nothing added that was not in the original. They are what a passing
 * generation looks like, not output from one.
 *
 * The show and the episode are invented, which this repo otherwise does not do:
 * ADR 0004 removed six seeded episodes for carrying invented transcripts under
 * the names of real publishers. The difference is the one that rule turns on —
 * `The Cell Desk` is nobody, credited to nobody, on a page that says it is a
 * mock-up. **Keep it that way.** Never move this fixture onto a real show's
 * name, and never move it into the catalogue.
 *
 * It is invented rather than lifted from a catalogue episode because no episode
 * in the catalogue is at a level where rung 2 has anything to do: the English
 * side is beginner VOA lessons, where there is no expression hard enough to
 * need elaborating and a restatement would only pad. The cue below is the
 * worked example from §R24 itself, so the demo and the spec cannot drift.
 */

export interface DemoCue {
  time: string;
  speaker: string;
  /** Rung 1. Always visible, never replaced. */
  text: string;
  /**
   * Rung 2, or `null` for a cue whose generation failed validation twice.
   * Criterion 9: rung 2 is hidden for that cue and rung 3 is offered directly,
   * which is why this is nullable rather than always present.
   */
  restatement: { text: string; hardExpression: string } | null;
  /** Rung 3. Always reachable — the feature never traps a learner. */
  translation: string;
}

export const DEMO_LEVEL = 'Intermediate';
export const DEMO_EPISODE = 'How a protein finds its shape';
export const DEMO_SHOW = 'The Cell Desk';

export const DEMO_CUES: DemoCue[] = [
  {
    time: '04:12',
    speaker: 'Host',
    text: 'A protein comes off the ribosome as a straight chain, and within milliseconds it folds itself into a shape.',
    restatement: {
      text: 'A protein comes off the ribosome — off the ribosome, the machine that builds it — as a straight chain, and within milliseconds, in less time than a blink, it folds itself into a shape.',
      hardExpression: 'ribosome',
    },
    translation: '蛋白質離開核糖體時是一條直鏈，幾毫秒之內就會自己摺疊成一個形狀。',
  },
  {
    time: '04:29',
    speaker: 'Guest',
    text: 'And misfolding is where it gets dangerous. A misfolded protein can clump together with others, and those aggregates are what we see in Alzheimer’s.',
    restatement: {
      text: 'And misfolding is where it gets dangerous. A misfolded protein can clump together with others — and those clumps, those aggregates, are what we see in Alzheimer’s.',
      hardExpression: 'aggregates',
    },
    translation: '摺疊錯誤就是危險的地方。摺錯的蛋白質會和其他蛋白質黏成一團，這些聚集體就是我們在阿茲海默症中看到的東西。',
  },
  {
    time: '04:47',
    speaker: 'Host',
    text: 'So the cell keeps chaperones on hand to catch that.',
    restatement: {
      text: 'So the cell keeps chaperones on hand — chaperones, helper proteins that stay nearby — to catch that.',
      hardExpression: 'chaperones',
    },
    translation: '所以細胞會隨時備有伴護蛋白來處理這種情況。',
  },
  {
    /**
     * The degraded case. Both generations dropped "in vitro" — criterion 6
     * rejects any output that does not contain the tapped expression verbatim,
     * criterion 9 says retry once and then hide rung 2 rather than show output
     * that failed. The demo carries one of these deliberately: a feature that is
     * only ever shown succeeding hides the behaviour that matters most.
     */
    time: '05:03',
    speaker: 'Guest',
    text: 'Anfinsen showed the chain can refold in vitro with no help at all.',
    restatement: null,
    translation: 'Anfinsen 證明了那條鏈在試管中完全不需要任何幫助就能重新摺疊。',
  },
];
