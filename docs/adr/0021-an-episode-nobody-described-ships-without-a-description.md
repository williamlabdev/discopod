# ADR 0021 — An episode nobody described ships without a description

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Amends:** [ADR 0010](0010-the-chinese-discopod-teaches-is-traditional.md) decision 2.
  `Episode.description` stays `Localized` and stays keyed by the learner's language;
  it stops being **required**. Nothing else in that decision changes.
- **Builds on:** [ADR 0003](0003-model-the-learner-language-pair.md), whose
  missing-key-is-exclusion rule still governs a description that exists, and
  [ADR 0020](0020-extracted-vocabulary-is-quoted-from-the-episode.md), which is the same
  failure one field over: a claim that was a convention, and stopped being true quietly.

## Context

The reported bug was a Vietnamese blurb reading `[Nhạc mở đầu] Nghe chuyện, nói tiếng
Trung.` — an audio-event tag from the subtitles, shown to a learner as a description of
the episode.

The tag is on **4 of the 25** ingested episodes. The field is wrong on all 25.

### The two keys were never the same sentence

`description` is one `Localized` field, which under ADR 0003 means one claim expressed in
whichever languages it has been written in. These two keys came from different derivations
that had nothing to do with each other:

- **`en`** was `firstSentence(metadata.title ?? title)` — the first sentence *of the
  title*. For episodes 200–204 the title begins `2.3.37A …`, so the description was split
  on the full stop and the shipped value was the literal string **`"2"`**. Five of 25 were
  three characters or fewer; **12 of 25 were the entire episode title**, which is why a
  card rendered its title twice.
- **`vi`** was the Vietnamese translation of the episode's **first transcript cue**. On
  200, 202 and 203 that is the show's jingle; on 204 it is `[Nhạc mở đầu vui tươi]`; on
  201 it is a Mint Mobile advert read by Ryan Reynolds; on 212 a sponsor line; on 213 a
  passing opening remark.

So the English key was a fragment of the title and the Vietnamese key was whatever the
audio happened to open with. Neither was a description of the episode, and the two were
not translations of each other.

Both were then interpolated into `learningGoal`, so the catalogue told an English speaker:

> Follow a full Mandarin podcast episode about 2.

and told a Vietnamese speaker that the episode was about a mobile-phone advert.

### Stripping the tag would have fixed four episodes

The obvious repair — filter bracketed cues out of the Vietnamese derivation — removes the
symptom from 4 episodes and leaves the advert read, the sponsor line and every `"2"` in
place, while making the field look repaired. That is worse than leaving it visibly broken.

### The field was required, so it got filled

Nothing here was careless. `Episode.description` was a required field, the ingest had a
title and a transcript and no description, and a required field with no source gets a
generated one. The check that existed (`assertEpisode`) asked whether the field was
present in the learner's language, which it always was — the generation guaranteed it.

The catalogue's own rule already had the answer and was not being applied: a missing key
is an exclusion, never a fallback (ADR 0003). What was missing here was not a key. It was
the description.

## Decision

### 1. `description` is optional, and an ingested episode has none

`Episode.description`, `Show.description` and `SeedRow.description` are all optional. The
25 ingested rows carry no `description` key at all.

**Absent renders as absent.** The card shows the episode title and nothing beneath it. No
renderer may substitute the title, the first cue, the show blurb, or a summary of its own
— the field's absence is the information that nobody has written one.

The title stays, because the title is the publisher's own claim about the episode. It is
the only sentence on an ingested card that someone who heard the episode wrote.

### 2. A description that exists is still a per-language claim

ADR 0010 decision 2 is otherwise untouched. When `description` is present it is
`Localized`, keyed by the learner's language, and a missing key is still an exclusion.
`assertEpisode` now checks `description[speaks]` **only when the field is present**, which
is the smallest change that admits an absent description without admitting a partial one.

The five authored lesson episodes and the three `en → zh-Hant` lesson episodes keep the
descriptions a person wrote for them. This ADR takes away generated descriptions, not
descriptions.

### 3. `learningGoal` is derived from what was measured, not from a topic

`learningGoalFor(minutes)` builds both keys from the episode's length:

> Follow a full 47-minute Mandarin episode by ear, without leaning on the translation.

It says nothing about what the episode is about, because the ingest does not know. Only
the length varies, because only the length is measured.

### 4. The rule is checked on the published seed, not only at ingest

`podcast-description.spec.ts` asserts that no episode in the podcasts seed carries a
description, and that every `learningGoal` is exactly what `learningGoalFor` returns for
that episode's own duration. Both were confirmed to fail when the old values are put back.

This is ADR 0020's arrangement and it is here for ADR 0020's reason: the ingest runs
against a source folder outside this repo, so an ingest-only check guards everything
except the file that ships.

## What this ADR does not do

**It does not touch the transcripts.** `[Nhạc mở đầu]` and the other 929 bracketed tags in
`transcript[].text` are correct there — they tell a learner reading along that what they
are hearing is not speech. The tag was never the defect; its appearance in a blurb was.

**It does not decide where a description should eventually come from.** Publisher show
notes are the obvious candidate and the ingest does not currently read them. When one
arrives it is a description with an author and a provenance, and it will need ADR 0019's
labelling if it is machine-translated into a learner's language.

**It does not make the catalogue smaller.** No episode is excluded by this change: the 25
podcast episodes that had a description now have none and still ship, and every episode
that had a real one still has it. Pair membership is unchanged.

**It does not restore the show blurb.** `Show.description` was taken from the first
episode row of each show, which on an ingested show means it was one of the generated
sentences above. Nothing renders it (ADR 0010 decision 2 says why), so it simply goes
absent rather than being replaced.

## Consequences we accept

**The cards say less, and they should.** A learner choosing between two episodes of the
same show now has the title, the level line, the speech rate, the length and the fit
reason. That is what the catalogue actually knows about an ingested episode. The previous
extra line was not information; twelve of them were the title again.

**Search lost a field.** The haystack no longer spans `description`. On the English side
it lost almost nothing real. On the Vietnamese side a learner can no longer find an
episode by typing words from its opening jingle, which is not a loss worth naming except
that somebody will notice the behaviour changed.

**`learningGoal` is now a template and reads like one.** Every 10-minute episode has the
same goal sentence. That is honest and it is dull, and it is a standing invitation to
write something better once there is something true to say. It is still machine-written
Vietnamese, so `authoredBy: { vi: 'auto-translated' }` and ADR 0019's label stay correct.

**Two shapes of episode now differ on the wire.** An authored episode has a description
and an ingested one does not, and the seed does not otherwise mark which is which — the
same untyped discriminator ADR 0020 recorded for vocabulary. The second time this bites,
it needs a field rather than a convention.

**A future ingest could reintroduce this in one line.** The failure mode was a required
field with no source. The field is now optional, which removes the pressure, and the spec
refuses a generated one on the way in; but nothing stops a new derivation being written
deliberately. It would have to be argued for, which is the point.
