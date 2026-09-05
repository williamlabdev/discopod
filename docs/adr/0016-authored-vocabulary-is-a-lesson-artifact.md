# ADR 0016 — Authored vocabulary is a lesson artifact, not a podcast-episode field

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Touches:** [ADR 0011](0011-postgres-is-a-publication-of-the-seed.md) decision 4 —
  saved words are the *learner*-authored vocabulary this ADR points at as the correct
  home for "the words this episode taught me". The publication/saved-words asymmetry
  from that ADR is what this one leans on.
- **Builds on:** [ADR 0015](0015-full-episode-ingestion-and-remote-audio.md), which
  admits the 24 podcast episodes this decision applies to.

## Context

`Episode.vocabulary[]` is an authored list — term, meaning, example sentence, and a
`sourcePrompt` anchor into the transcript. It drives the *Vocabulary* tab, the
discovery card's `newWords: N` line, and `DifficultyProfile.vocabularyCoverage`,
which `CatalogService.rankEpisodes` reads when scoring an episode.

For the five lesson-shaped episodes (7, 102, 103, 104, VOA), authoring five to ten
entries per episode was defensible: the recording exists to teach a specific set of
words, and the seed author was transcribing the teacher's stated goals. `newWords: 6`
on a VOA *Let's Learn English* lesson claims that six words are what the lesson is
*for*, which the lesson agrees with.

For a 22-minute conversation between two Taiwanese hosts about the Silk Road, "the
words this episode teaches" is not a coherent list. The episode teaches whatever the
listener does not already know — 使者 for one, 絲綢 for another, in a different
ordering for a third. That is what the saved-words feature captures (ADR 0011
decision 4): saved words are the one thing the seed cannot regenerate, because they
are what the learner did, not what the catalogue asserted. Authoring a five-item vocab
list for the same episode would be fabrication — a claim about which five terms
matter, made by an author under the constraint of choosing five.

## Decision

### 1. Ingested episodes ship `vocabulary: []` and `questions: []`

Every episode the podcast ingest emits carries an empty vocabulary array and an empty
questions array on the seed row. The type stays the same; the arrays are permitted to be
empty, and empty means "this episode is not a lesson with authored teaching content."

### 2. The Vocabulary tab and `newWords` line are conditional

The episode page hides the *Vocabulary* tab when `vocabulary.length === 0`. The
discovery card omits its `newWords: N` line under the same condition. Rendering
`newWords: 0` would be worse than rendering nothing: zero is a claim, absence is the
absence of one.

The two affordances become conditional together and for the same reason. Nothing in the
UI treats an empty vocabulary as an error; it treats it as the shape of an episode that
is not a lesson.

### 3. `vocabularyCoverage` is not a ranking signal on ingested episodes

`CatalogService.rankEpisodes` already tolerates an absent `vocabularyCoverage`; the
existing lesson episodes are the only rows that supplied it meaningfully. Ingested
episodes make that fallback load-bearing — for 24 of the ~29 rows, the ranker scores
from `LearningLevel`, `cpm`, and pause structure alone. That is a real weakening of the
score, priced in the consequences below.

## What this ADR does not do

**It does not delete `vocabulary` from the type.** The lesson episodes still author it,
still render it, still feed it into the ranker. `vocabulary` is a first-class field for
content that is shaped like a lesson, and the type does not need a discriminator
because the discriminator is `vocabulary.length`.

**It does not describe tap-a-word lookup.** The eventual replacement — tap a character
in the transcript, look it up against a dictionary, save the term into the learner's
saved words — is a separate design. It will read from the transcript, not from
`Episode.vocabulary`, and produce saved words through the ADR 0011 path.

**It does not touch the existing five episodes.** Their `vocabulary` arrays are
unchanged, the *Vocabulary* tab renders on them, and their `newWords` counts still
appear on the card. Two shapes of episode coexist; the shape is declared by the seed
row and read by the UI.

## Consequences we accept

**Two UI affordances become conditional.** A *Vocabulary* tab on some episodes and
not others, a `newWords` line on some cards and not others. A real inconsistency, and
the correct one: the alternative is fabricating uniform authored content on episodes
that have none.

**The ranker weakens on ingested episodes.** Two Intermediate episodes at the same
`cpm` and pause density are now a tie the ranker cannot break. The fix is the
tap-a-word lookup that produces saved-word data — the source ADR 0011 identifies as
the one form of learner-specific vocabulary the catalogue does not invent.

**`newWords: 0` never ships.** The loader may *read* it (for back-compat); the ingest
never *writes* it, and the UI hides the line when `vocabulary.length === 0`. A card
reading "0 new words" says the episode teaches nothing, which is false.
