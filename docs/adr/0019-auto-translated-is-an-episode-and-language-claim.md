# ADR 0019 — "Auto-translated" is a per-episode, per-language claim, shown wherever the text is

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Touches:** [ADR 0017](0017-english-overlay-from-machine-translation.md) decision 2,
  which introduced the label and scoped it to the transcript overlay; and
  [ADR 0003](0003-model-the-learner-language-pair.md), whose
  missing-key-is-an-exclusion rule is why the Vietnamese pair could ship a page that
  contradicted itself without failing any build.
- **Builds on:** [ADR 0018](0018-vietnamese-as-a-learner-language.md), which added a
  pair where *every* learner-facing string is machine-written.

## Context

ADR 0017 put an "Auto-translated" label on the transcript panel, gated on
`Episode.overlayVerified === false`. That was the whole of the machine translation in
the app at the time: the English overlay on Mandarin cues.

ADR 0018 changed the shape of the problem. In `vi → zh-Hant` the description, the level
reason, the learning goal, the ranker's fit reason and every vocabulary meaning are
machine-written — the seed records this per episode as
`authoredBy: { "vi": "auto-translated" }`. A reader of that pair meets four sentences of
machine translation on the discover card before ever opening an episode, and the only
label in the app was two clicks away, inside a panel, describing a different field.

Two facts were also being conflated. `overlayVerified` is about the cue translations.
`authoredBy[speaks]` is about the author copy. The same episode is hand-written English
and machine-written Vietnamese at once, so a single per-episode boolean cannot answer
"is what I am reading machine-written?" — the answer depends on which pair you are in.

Separately, the `vi` half of that claim was empty where it mattered most. All 86
vocabulary entries carried an `en` meaning and no `vi` meaning. Under ADR 0003 a missing
key excludes rather than falls back, so `/vi/zh-Hant/words` correctly showed nothing,
the Vocabulary tab correctly did not render, and no test failed — the pair silently had
no vocabulary at all.

## Decision

### 1. The claim is `authoredBy[speaks]`, resolved per pair

`EpisodeCard.autoTranslated` is `episode.authoredBy?.[pair.speaks] === 'auto-translated'`,
computed in `apps/web/lib/catalogue.ts` where the card is already pair-resolved. It is a
separate field from `overlayVerified`, not a widening of it: the two describe different
text and can disagree on the same episode.

### 2. The label renders wherever machine-written learner text does

One component, `app/[speaks]/[learning]/auto-translated.tsx`, on four surfaces: the
discover cards and the start-here block, the learning-list rows, the vocabulary page's
per-episode headings, and the episode page's header. The transcript panel keeps its own
badge on `overlayVerified`, because that badge is about the cues.

It is a label, not a warning. The text is still shown, and shown by default — ADR 0017
decision 3 already rejected hiding it.

### 3. Vietnamese vocabulary meanings are translated at ingest, from the same input

`vocab.seed.json` gains `definitionVi` beside `definition`, and
`podcasts-from-folder.ts` emits `meaning: { en, ...(definitionVi ? { vi } : {}) }`. The
`vi` key is written only when the input has one — never `vi: entry.definition`, which
would ship an English gloss under a Vietnamese key and defeat the exclusion rule that
ADR 0003 exists to enforce.

The input, the script and the emitted seed are changed together so that re-running the
ingest against the source folder reproduces what is committed, rather than reverting it.

### 4. CI asserts the Vietnamese subtree, including that it has vocabulary

`.github/workflows/ci.yml` asserts `out/vi/zh-Hant.html`, an episode page under it, the
absence of `out/vi/en.html`, that the chooser offers `Tiếng Việt`, and that the pair's
learner text is Vietnamese. It also asserts the discover page carries a "new words" line
— which is counted from entries with a `vi` meaning, so it is absent for the whole pair
the moment vocabulary stops being translated. That is the regression this ADR fixes,
expressed as the check that would have caught it.

## What this ADR does not do

**It does not claim the translations are good.** `vocab.seed.json`'s provenance already
says the English definitions are model-written and unverified against a dictionary; the
Vietnamese is a model translation of that, and says so. The label is the honest
disclosure, not a quality gate.

**It does not localise UI chrome.** ADR 0018 decision 5 stands: the app's own words are
English in every pair. "Auto-translated" is one of them.

**It does not settle whether ingested episodes should carry authored vocabulary at
all.** [ADR 0016](0016-authored-vocabulary-is-a-lesson-artifact.md) decision 1 says
every ingested episode ships `vocabulary: []`; the shipped seed carries 86 entries
across 21 of the 25 podcast episodes, sourced from `vocab.seed.json`. That reversal
arrived without an ADR and is still unrecorded. This ADR translates the entries that are
there — it does not decide that they belong there. See HANDOFF.md.

## Consequences we accept

- A fifth surface that renders learner-language prose will need the label added by hand.
  The component makes that one import; nothing enforces it. The CI check in decision 4
  guards the data, not the labelling.
- `autoTranslated` is per episode, so an episode whose description was translated and
  whose vocabulary was later hand-written would be over-labelled. That is the safe
  direction, and no episode is in that state today.
- The English pair shows no card-level label, because `authoredBy` records only `vi`.
  The English author copy for the ingested episodes is the copy the Vietnamese was
  translated *from*; if it turns out to be model-written too, that is an `authoredBy.en`
  change in the seed and no code change here.
