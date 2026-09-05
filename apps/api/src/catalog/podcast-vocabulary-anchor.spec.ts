import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ADR 0020 decision 2, enforced on the shipped artifact rather than only at ingest.
 *
 * An ingested episode is allowed to carry vocabulary because the entries are
 * *extracted* — the term occurs in the episode, and the example is the line it
 * occurs in. Neither claim survives being a convention: the examples were
 * originally written against the pre-conversion Simplified transcript, and 71 of
 * 86 shipped a sentence the episode never said in a script the catalogue does not
 * teach (ADR 0010), while every check that existed stayed green.
 *
 * The ingest now refuses such an entry, but the ingest only runs against a source
 * folder that lives outside this repo. This spec is the half that runs in CI, on
 * the file that is actually published.
 *
 * Scoped to the podcasts seed on purpose. It is the ingest's output file, which is
 * the only discriminator the seed offers between an extracted entry and an authored
 * one — the wire shape is identical, as ADR 0020 records under consequences. The
 * base `catalog.seed.json` holds authored lesson vocabulary whose examples are
 * written *about* the lesson, and only 7 of its 26 satisfy this rule; that is
 * correct for it and is why widening this spec to every seed would be wrong.
 */

interface Cue {
  text?: string;
}

interface Entry {
  term: string;
  example?: string;
}

interface Episode {
  id: number;
  transcript?: Cue[];
  vocabulary?: Entry[];
}

const SEED = 'catalog.en-zh-Hant.podcasts.seed.json';

const episodes: Episode[] = JSON.parse(
  readFileSync(join(__dirname, 'data', SEED), 'utf8'),
) as Episode[];

/**
 * Every run of one to three consecutive cues, joined bare.
 *
 * Bare because a sentence broken across subtitle lines is still one sentence and
 * the cue text carries no trailing space; up to three because that is the longest
 * run any entry needed, and a wider window would start matching by coincidence.
 */
function cueRuns(episode: Episode): Set<string> {
  const cues = (episode.transcript ?? []).map((cue) => cue.text ?? '');
  const runs = new Set<string>();
  for (const length of [1, 2, 3]) {
    for (let i = 0; i + length <= cues.length; i += 1) {
      runs.add(cues.slice(i, i + length).join(''));
    }
  }
  return runs;
}

describe(SEED, () => {
  it('ships at least one episode with vocabulary, so the rules below are not vacuous', () => {
    const withVocabulary = episodes.filter((episode) => (episode.vocabulary ?? []).length > 0);
    expect(withVocabulary.length).toBeGreaterThan(0);
  });

  it('quotes every vocabulary example from its own episode, verbatim', () => {
    const offenders: string[] = [];
    for (const episode of episodes) {
      const runs = cueRuns(episode);
      for (const entry of episode.vocabulary ?? []) {
        if (entry.example && !runs.has(entry.example)) {
          offenders.push(`${episode.id} ${entry.term}: ${entry.example}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('takes every vocabulary term from words the episode actually says', () => {
    const offenders: string[] = [];
    for (const episode of episodes) {
      const spoken = (episode.transcript ?? []).map((cue) => cue.text ?? '').join('');
      for (const entry of episode.vocabulary ?? []) {
        if (!spoken.includes(entry.term)) {
          offenders.push(`${episode.id} ${entry.term}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('ships no comprehension questions, which ADR 0020 left to ADR 0016', () => {
    const withQuestions = episodes.filter(
      (episode) => ((episode as { questions?: unknown[] }).questions ?? []).length > 0,
    );
    expect(withQuestions).toEqual([]);
  });
});
