# ADR 0018 — Vietnamese is a learner language, served by an overlay of the Mandarin catalogue

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Builds on:** [ADR 0006](0006-separate-spoken-language-from-written-form.md), which
  separates written form (Latn) from spoken language (`vi`) — Vietnamese slots into
  `WRITTEN_FORMS` cleanly under those types. And
  [ADR 0012](0012-two-directions-and-en-to-en-is-not-one.md), whose rule about
  serving only pairs whose two sides differ makes `vi → zh-Hant` a real pair the
  moment the overlay exists and `vi → vi` a pair that never appears.
- **Extends:** [ADR 0003](0003-model-the-learner-language-pair.md). Vietnamese is the
  third key `Localized` has ever carried.

## Context

Every episode in the source folder for the podcast ingest ([ADR
0015](0015-full-episode-ingestion-and-remote-audio.md)) carries both
`bilingual.en.srt` and `bilingual.vi.srt`. ElevenLabs Scribe v2 produced both from the
same Mandarin audio; timings are the Chinese transcript's timings; both are machine
translations under the same [ADR 0017](0017-english-overlay-from-machine-translation.md)
caveat.

The Vietnamese overlay is not a hypothetical the ingest might one day serve — it is
material that already exists, cued to the material being ingested. The alternative to
admitting Vietnamese as a `LanguageTag` is deleting `bilingual.vi.srt` during ingest,
which discards content for no reason other than that no route serves it.

The repo's language machinery is designed for this shape. `Localized<T>` is a
`Partial<Record<LanguageTag, T>>`; `LanguageTag` is a closed union; overlays are keyed
by it; `pick()` returns `undefined` on a missing key (the ADR 0003 exclusion rule,
never a fallback). Adding a fourth `LanguageTag` is mechanical: the compiler names the
exhaustive switches, each grows one arm.

## Decision

### 1. `vi` joins `LANGUAGES`

`LANGUAGES` becomes `['en', 'zh-Hant', 'zh-Hans', 'vi'] as const`. `WRITTEN_FORMS`
gains `vi: { spoken: 'vi', script: 'Latn' }`. `SPOKEN_LANGUAGES` gains `'vi'` because
`WRITTEN_FORMS.vi.spoken` has to be a valid `SpokenLanguage` even though no Vietnamese
audio ships. `speech-rate.ts` gets a `vi: 'wpm'` arm on `rateUnitFor`: Vietnamese is
space-separated, so words-per-minute is the honest unit whenever Vietnamese audio does
ship. TypeScript names the exhaustive switches that break; each fix is one `case 'vi':`
arm or one more key in a `Record<LanguageTag, …>` literal — the mechanical audit is
the whole point of the closed union.

### 2. `vi → zh-Hant` is served through a new overlay

`catalog.vi-zh-Hant.podcasts.overlay.json` is the sibling of the English overlay and
sits in `OVERLAY_LANGUAGES` next to `zh-Hant`. Every ingested episode in the 200-299
range has an English overlay entry (English cue translations, English authored copy
on the seed) and a Vietnamese overlay entry (Vietnamese cue translations, Vietnamese
`levelReason` / `learningGoal` / `description`).

The Vietnamese authored copy is machine-translated from the English at ingest time.
`overlayVerified: false` records this at the episode level; Vietnamese authored text
carries the same honesty burden as Vietnamese cue text, and the UI labels both under
the same mechanism ADR 0017 describes.

### 3. The `[speaks]` route accepts `/vi/…`

The pair chooser gains a Vietnamese option; the `[speaks]` route parameter accepts
`vi`. `listPairs` derives `vi → zh-Hant` from the presence of Vietnamese overlay
content on `zh-Hant`-transcript episodes; `vi → vi` never appears because
[ADR 0012](0012-two-directions-and-en-to-en-is-not-one.md) already excludes
same-side pairs.

## What this ADR does not do

**It does not localise the UI chrome.** A Vietnamese learner sees Chinese cues,
Vietnamese overlay text, and English buttons, tabs, and headers — the same limitation
the existing `zh-Hant → en` pair has for Chinese-speaking learners of English.
Chrome i18n is real work with its own design and its own bundle-size question, and it
does not depend on the ingest that produces the content. Landing content before
chrome is the right ordering; the alternative is content nobody can read.

**It does not add Vietnamese to the earlier lesson episodes.** Episodes 7, 102, 103,
104 and the VOA lessons have no Vietnamese overlay entry, and the loader treats that
as absence rather than error (ADR 0003 decision 3). A Vietnamese learner sees the 24
podcast episodes and not the five lessons — the exclusion is content-derived, not a
special case.

**It does not seed Vietnamese audio.** No `vi → en` pair, no `vi → zh-Hant` where the
audio is Vietnamese. `SPOKEN_LANGUAGES` is extended because the type demands it, not
because the catalogue is ready to publish Vietnamese speakers.

## Consequences

**Exhaustive switches on `LanguageTag` grow one arm each.** The mechanical audit the
closed union exists to force. Missing an arm is a build failure, and every arm is a
deliberate decision made at the point the tag was added.

**Two overlays decorate the podcast seed.** English and Vietnamese, each keyed by
episode id, each with the same `overlayVerified: false` semantics. Adding a third
learner language later is one overlay file and one `LANGUAGES` entry.

**The build emits three route subtrees instead of two.** `/en/zh-Hant/…`,
`/zh-Hant/en/…`, and `/vi/zh-Hant/…`. `DEFAULT_PAIR` stays `en → zh-Hant`
([ADR 0012](0012-two-directions-and-en-to-en-is-not-one.md)): a Vietnamese speaker
who has not chosen a pair is not the caller `DEFAULT_PAIR` exists to serve.
