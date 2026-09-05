# ADR 0020 — Extracted vocabulary is quoted from the episode, and that is what makes it shippable

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Supersedes:** [ADR 0016](0016-authored-vocabulary-is-a-lesson-artifact.md) decision 1,
  for `vocabulary` only. Its `questions: []` half stands, and decisions 2 and 3 are
  untouched and still load-bearing.
- **Builds on:** [ADR 0010](0010-the-chinese-discopod-teaches-is-traditional.md), whose
  Traditional-or-nothing rule the shipped examples were quietly breaking; and
  [ADR 0019](0019-auto-translated-is-an-episode-and-language-claim.md), which labels the
  part of an entry that is model-written.

## Context

ADR 0016 decided that an ingested podcast episode ships `vocabulary: []`. The reasoning
was sound and is worth keeping in front of us:

> Authoring a five-item vocab list for the same episode would be fabrication — a claim
> about which five terms matter, made by an author under the constraint of choosing five.

The seed does not do that. It carries **86 vocabulary entries across 21 of the 25**
podcast episodes, between one and ten per episode. That reversal arrived with the
`vocab.seed.json` ingest input and was never written down. This ADR is the choice ADR
0016's absence forced: either the entries come out, or the reason they are not what ADR
0016 forbade gets stated where it can be attacked.

They come from a different process than the one ADR 0016 rejected, and it is the
process — not the count — that decides whether they are honest:

> Candidates proposed from transcript excerpts, then kept only if they occur verbatim in
> the show's own transcript.
>
> — `vocab.seed.json`, `provenance.terms`

### ADR 0016 had two shapes where there are three

**Authored** vocabulary is a claim about what an episode is *for*. `newWords: 6` on a VOA
*Let's Learn English* lesson says six words are the point of the recording, and the
recording agrees. Five episodes are shaped like that.

**Nothing** is ADR 0016's answer for the other shape, and it reached it by elimination:
a 22-minute conversation about the Silk Road is not *for* any six words, so it gets no
list.

**Extracted** vocabulary is the third shape, and it makes neither claim. It says: this
term occurs in this episode, here is the line it occurs in, here is a gloss. It does not
say the term is what the episode teaches, does not say it is among the most important
words in it, and does not say the list is complete. An episode with three entries is not
claiming to teach three words — it is offering three words it demonstrably contains.

That is a weaker claim than ADR 0016 was defending against, and weak enough to be true.

### The anchor was a convention, so it broke

The claim above is only worth something if it holds, and it did not. The vocabulary
examples were written against the ASR transcript *before* its conversion to Traditional,
while the shipped cues are Traditional. **71 of the 86 examples were therefore not the
line the learner hears** — 66 of them carrying outright Simplified-only characters, so
that a vocabulary card showed a Traditional headword above a Simplified sentence, on a
catalogue ADR 0010 declares Traditional.

The existing ingest check did not catch it, and could not: it asserts the *transcript*
contains no Simplified-only character, and the transcript was clean. Nothing compared the
example to it.

Nothing had to be converted to fix this. The Traditional line already existed as a cue —
so each example was re-derived by matching it back to the run of consecutive cues it came
from, and copied. That is why 台南 became 臺南 and not the other way round: the transcript
had already made that choice, and Hant↔Hans is many-to-one and a guess (ADR 0006).

## Decision

### 1. An ingested episode may ship extracted vocabulary; it still ships no questions

`vocabulary: []` is no longer required of an ingested episode. It remains *permitted*,
and four of the twenty-five episodes still ship an empty list, so nothing downstream may
treat a non-empty one as guaranteed.

ADR 0016's `questions: []` half is unchanged and not up for reconsideration here. A
comprehension question has no equivalent of the anchor below — there is nothing in the
episode for it to be quoted from — so the argument this ADR makes does not reach it. All
25 episodes ship `questions: []`.

### 2. Extraction means two anchors, and both are checked

An entry qualifies as extracted when:

- its **term** occurs verbatim in the episode's transcript, and
- its **example** is a verbatim run of one to three consecutive cues of that transcript.

Both are asserted: `vocabularyFor` throws at ingest, naming the episode and term, and
`podcast-vocabulary-anchor.spec.ts` re-checks the published seed in CI. They are checks
rather than conventions precisely because this was a convention and silently stopped being
true for 71 entries.

One to three cues, not one, because a sentence broken across subtitle lines is still one
sentence; the run is joined bare and matched against the episode's own text.

### 3. The word count is derived from the entries, never authored

`newWords` is computed as the number of entries whose `meaning` carries this pair's
`speaks` key — `catalogue.ts:250`. It is not a seed field. `newWordCount` and
`vocabularyCoverage` stay unwritten on ingested rows.

This keeps ADR 0016's real insight: a count is a claim, and one nobody has made must not
appear. It also makes the count pair-specific, which it has to be — the same episode
truthfully offers a different number of words to a reader whose language covers 86
entries than to one whose language covers none. That is the failure ADR 0019 was written
about, and this is the line that reports it honestly instead of hiding it.

### 4. Everything unfalsifiable in an entry stays labelled

The two anchors are checkable. The rest of an entry is not: `definition`,
`partOfSpeech` and `level` are model-written and unverified against a dictionary, and
`definitionVi` is a machine translation of `definition`. `vocab.seed.json`'s
`provenance` says so, and ADR 0019 puts "Auto-translated" on every surface that renders
them.

Extraction earns the entry a place in the catalogue. It does not upgrade the gloss.

## What this ADR does not do

**It does not restore `vocabularyCoverage` as a ranking signal.** ADR 0016 decision 3
stands: the ranker still scores ingested episodes from level, `cpm` and pause structure
alone. An extracted list is a sample of an episode's vocabulary, not a measurement of its
difficulty, and averaging a sample into a coverage figure would invent exactly the
authority this ADR declines.

**It does not un-condition the UI.** ADR 0016 decision 2 is untouched and still carries
weight: four episodes have no entries, the *Vocabulary* tab hides on them, and the
`newWords` line is omitted rather than rendered as zero.

**It does not claim the glosses are correct.** No entry has been checked against a
dictionary. The anchor establishes that a word was said and where; it says nothing about
whether the definition next to it is right.

**It does not describe tap-a-word lookup.** ADR 0016's eventual replacement is still the
right end state and still unbuilt. Extracted vocabulary is a fixed list chosen at ingest;
tap-a-word is the learner choosing. This ADR makes the interim list honest, not
permanent.

**It does not re-open episode 101.** The five original lesson episodes are authored, not
extracted, and are governed by ADR 0016 as written.

## Consequences we accept

**Two kinds of vocabulary now coexist, and the seed does not distinguish them.** A lesson
episode's authored list and an ingested episode's extracted list are the same shape on
the wire. A reader of the seed cannot tell which claim an entry is making without knowing
which episode it belongs to. The discriminator is the show, and it is not encoded — if a
third shape appears, this needs a field rather than a convention.

**The lists are uneven and that is visible.** One episode offers ten entries, another
one, four offer none. A learner comparing two episodes may read that as a difficulty
signal. It is not one; it is how many terms survived the anchor.

**A bad transcript line becomes a bad example.** Anchoring to the cues means an ASR error
is quoted rather than smoothed. That is the right trade — the learner hears the same line
— but it does mean vocabulary quality is now bounded by transcript quality, and a
correction to a cue silently changes an example that was already published.

**The anchor is checked twice, in two different places, on purpose.** `vocabularyFor`
refuses it at ingest, and `podcast-vocabulary-anchor.spec.ts` refuses it on the published
seed — because the ingest runs against a source folder outside this repo and therefore
does not run in CI, so an ingest-only check would have guarded everything except the file
that ships. The spec is scoped to the podcasts seed, which means the scoping *is* the
discriminator named above: widen the ingest to another seed file and the spec must be
widened by hand or it silently stops covering it.
