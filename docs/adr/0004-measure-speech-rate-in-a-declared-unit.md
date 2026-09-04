# ADR 0004 — Measure speech rate in a declared unit, and treat an uncalibrated unit as an exclusion

- **Status:** Accepted
- **Date:** 2026-09-04
- **Extends:** [ADR 0003](0003-model-the-learner-language-pair.md), whose rule "a missing
  key is an exclusion, never a fallback to English" this applies to a second kind of
  missing thing

## Context

ADR 0003 modelled the language pair and shipped `{ speaks: 'zh-Hant', learning: 'en' }` as
the first real one. The route tree, the reason renderer and the overlay mechanism all
work. What that exposed is that the pair the product actually exists for — a Chinese
speaker's mirror image, `en → zh-Hant`, English speaker learning Mandarin — cannot be
served by this catalogue for two reasons that have nothing to do with the pair model.

**The ranking signal has no unit.** `DifficultyProfile.speechRate` was a bare `number`,
and `CatalogService`'s thresholds read

```ts
const COMFORTABLE_RATE = {
  Beginner: 110, Intermediate: 145, Advanced: 180,
};
```

Those are English words per minute. Nothing said so. Speech rate is the heaviest term in
the suitability score — 0.4 of it, against 0.3 for coverage, 0.2 for speaker count and 0.1
for register — and the whole product is the claim that this score answers "can this
learner follow it by ear?".

Mandarin is not counted in words. Running Mandarin speech is conventionally measured in
characters per minute, and a natural rate lands in a range that has no overlap with the
English word-per-minute range at all. Put a Mandarin episode into this profile and its
number goes through thresholds calibrated for a different quantity. The result is not a
slightly wrong ranking. It is a number with no meaning, presented in the same typeface,
with the same confidence, in the same "at a pace you can follow" sentence, as one that
means something. Nothing in the code would have noticed, and nothing on the page would
have looked wrong.

**Six of the seven episodes were fabricated.** While tracing where a Chinese catalogue
would come from, the seed data turned out not to be what it looked like. `catalog.seed.json`
held seven rows, of which one — `Let's Learn English`, VOA, `verifiedLesson: true` — is a
real published lesson with the publisher's own audio and transcript in `public/audio/`.
The other six carried the names of real, currently-published shows (*How I Built This*,
*Hidden Brain*, *99% Invisible*, *Search Engine*, *Ologies*, *Articles of Interest*) with
invented episode titles, invented descriptions, and invented transcript lines attributed
to those publishers by name.

That is not placeholder data. Placeholder data says "Example Show". These rows put words
into named publishers' mouths, and they were the majority of the visible catalogue.

The two problems met on the critical path. Retiring the degenerate `en → en` pair means
translating the catalogue into `zh-Hant`, and six sevenths of that translation work would
have been the careful rendering of fabricated quotes into a second language.

## Decision

### 1. A speech rate carries the unit it is counted in

`apps/api/src/catalog/speech-rate.ts`:

```ts
export type SpeechRateUnit = 'wpm' | 'cpm';
export interface SpeechRate { value: number; unit: SpeechRateUnit; }
```

`DifficultyProfile.speechRate` is that shape, not a number. `wpm` counts orthographic
words; `cpm` counts Han characters. The two are not convertible by a constant — a
two-character Chinese word is one word and two characters, and which of those a listener
has to process is precisely what the unit encodes.

The unit is a property of the **audio's** language, never the learner's: it is the same
105 wpm whether the reader is reading about it in English or in Chinese. So it is derived
from the show's language (`rateUnitFor`) and stored on the profile, rather than chosen at
render time.

### 2. Thresholds are per unit, and only `wpm` has any

```ts
const COMFORTABLE_RATE: Partial<Record<SpeechRateUnit, Record<LearningLevel, number>>> = {
  wpm: { Beginner: 110, Intermediate: 145, Advanced: 180 },
};
```

`Partial`, with no `cpm` row. Knowing *how* you would count Mandarin is not the same as
knowing *how fast is too fast*, and those are two separate pieces of knowledge this
project has exactly one of. Figures for Mandarin exist in the literature; none of them
have been checked against this app's own listeners, and writing three plausible numbers
into that table would be the same act as writing a plausible suitability score into an
episode — a fabricated ranking signal in the same clothes as a measured one, which the
repo's standing rule already forbids for the completion half of the model.

### 3. An uncalibrated unit excludes the episode, from every pair

`CatalogService.speaksTo` gains a third condition, alongside the two from ADR 0003:

```ts
isCalibrated(episode.profile.speechRate.unit) &&
canRenderReason(speaks) &&
inLanguage(episode.profile.reason, speaks) !== undefined
```

This one differs from the other two in scope. The reason conditions are about the reader,
so they exclude an episode from *one* pair's catalogue. The unit is about the audio, so it
excludes the episode from **every** pair: an episode we cannot honestly place on the "can
you follow this by ear?" axis has no suitability score to offer anybody, in any language.

`rank()` throws rather than scoring an uncalibrated episode. That path is unreachable
through `speaksTo`, and it is written to fail loudly if a future caller reaches the ranking
another way, because the failure it guards against is silent by construction.

This is ADR 0003's rule, applied to a second kind of absence. There, a missing translation
key excluded an episode rather than falling back to English. Here, a missing calibration
excludes it rather than falling back to English thresholds. Both fallbacks would have
produced a page that renders.

### 4. The six unverified rows are removed, not translated

`catalog.seed.json` holds one row: the VOA lesson. That is the whole catalogue of verified
material, and the catalogue should say so.

Removing them is cheaper than it looks. The six had no audio and no `sourceUrl`, so nothing
on their pages could be checked against a publisher; what they contributed was the
*appearance* of a stocked catalogue. The visible cost — a discovery page with one episode,
and two of three levels empty — is the true state of the content, and `startHere`'s
documented fallback to the best episode overall already handles it.

### 5. The taught language is read from the pair, not hard-coded

Four places named English directly, left over from when it was the only thing taught: the
root metadata description, `discover.tsx`'s "Choose your English level", the episode page
title's `"${level} English lesson"`, and the caption `<track srcLang="en" label="English">`
(which would have labelled a Mandarin lesson's captions as English, in the attribute a
browser's caption menu selects on). All four now read `pair.learning`.

The name shown is the language's own — `LANGUAGE_NAMES` holds endonyms — so an English
speaker's Mandarin pages say 繁體中文, as the pair chooser on `/` already does.

## What this ADR does not do

- **It does not add Chinese audio.** No source is chosen and none is ingested. The
  candidates surveyed are recorded in the handoff, not here, because which one gets picked
  is a licensing and pedagogy question, not an architectural one.
- **It does not calibrate `cpm`.** That row is a claim someone has to stand behind, and
  this ADR's whole point is that it may not be invented in passing to unblock a build.

  > **Superseded by [ADR 0008](0008-calibrate-cpm-by-extrapolation-and-label-it.md),
  > 2026-09-04.** The row now exists, by extrapolation from the `wpm` row rather than by
  > measurement, owned and labelled as such. ADR 0008 does not claim to clear the bar this
  > sentence sets; it argues the bar was set against unattributed numbers and states its
  > own reasoning where it can be attacked. Decision 3 below — an uncalibrated unit
  > excludes — is untouched and still governs every unit that has no row.
- **It does not localize the interface.** The UI copy around the one corrected word is
  still English for every pair. Writing that word correctly does not pretend otherwise.
- **It does not touch `proficiency`.** ADR 0003 decision 7 (`cefr` → scale-qualified band)
  has exactly the same shape as this ADR's decision 1 — a bare value whose scale is
  implied — and remains outstanding. CEFR is as wrong for a Mandarin learner as `wpm` is
  for Mandarin audio.

## Consequences we accept

- **The catalogue is one episode.** Both pairs now serve the same single lesson;
  Intermediate and Advanced are empty. This is loud, and it is the point: the app now shows
  how much verified content exists rather than how much content exists.
- **Adding Mandarin audio is now blocked on a number.** Ingesting a Chinese show is not
  enough — it will be excluded from every catalogue until a `cpm` row exists. That block is
  deliberate: it fails at the point where the missing knowledge is, instead of at the point
  where a learner is told an episode is followable. *(Lifted 2026-09-04 by
  [ADR 0008](0008-calibrate-cpm-by-extrapolation-and-label-it.md). The block did its job:
  it held for four ADRs and was released by a decision rather than by a build.)*
- **The exclusion is invisible from outside.** An episode dropped for an uncalibrated unit
  looks, over HTTP, exactly like an episode that does not exist. The same was already true
  of ADR 0003's translation exclusions; `catalog-api.ts`'s `assertEpisode` remains the
  backstop, and now also rejects a bare-number `speechRate` by name, since an API still
  sending one is an API that never learned this distinction.
- **The palette in `presentation.ts` still names the six removed shows.** Harmless — it is
  keyed by show id with a deterministic fallback — and left in place because those shows
  are real and may one day be ingested for real.
