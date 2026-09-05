# ADR 0017 — English cue translations are auto-translated, and the UI must say so

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Builds on:** [ADR 0010](0010-the-chinese-discopod-teaches-is-traditional.md),
  which established that a claim about Mandarin content is evidenced or labelled,
  never assumed. Same rule, one axis over: a translation is verified or labelled
  unverified, never shown as if it were verified.
- **Touches:** [ADR 0013](0013-measure-the-rate-over-the-speech-span.md). Both are
  about publishing measurements rather than claims — 0013 says the rate is the number
  the audio produces; this one says the translation is the string the ASR produced.

## Context

Episode 102 (海山漁港, `en → zh-Hant`) ships without English cue translations. The
learner reads Chinese cues directly, and the absence of an English overlay is
deliberate: at 84 seconds a determined learner can work through unfamiliar characters
using the transcript alone, and a gloss would distract from the writing system the
episode exists to teach.

The 24 ingested episodes ([ADR
0015](0015-full-episode-ingestion-and-remote-audio.md)) are 20–45 minutes long. A
Level 2 learner who opens a 40-minute conversation about Taiwanese labour law does not
"determinedly work through" it — they either follow it or lose the thread, and once
the thread is lost the remaining 30 minutes are noise. An English translation cued to
the same timings is the crutch that keeps the learner in the episode; the choice is
between one produced by ElevenLabs Scribe v2 and none at all.

The auto-translation's timings are trustworthy — same cue boundaries as the Chinese
transcript, same ASR pass. Its wording is not. A learner who reads it as truth is
being lied to by omission; a learner who reads it labelled is handed a tool with its
limits stated.

## Decision

### 1. Ingested episodes carry English cue translations from `bilingual.en.srt`

`SeedRow.transcript[].translation` is an optional English string per cue. The ingest
reads `bilingual.en.srt`, keys each cue by start-time milliseconds, and joins against
the Chinese transcript's cues by that key. Where a Chinese cue has a matching English
cue the seed row gets `translation: "…"`; where it does not (a cue of just numbers or
a proper noun) the field is absent.

The loader lifts `translation` into `TranscriptCue.translation` as
`{ [pair.speaks]: text }` — the same `Localized` shape every learner-facing string
uses, keyed by the `speaks` side of the pair. For the podcasts seed that key is `en`.
Vietnamese cue translations are the same shape on the Vietnamese overlay
([ADR 0018](0018-vietnamese-as-a-learner-language.md)), not on the seed row.

### 2. Every ingested episode carries `overlayVerified: false`

`Episode.overlayVerified?: boolean` records whether the overlay text was authored by a
human against the audio. On ingested episodes it is `false`. The field is written
explicitly — not left absent — because absence would mean "no claim made" and the claim
being made is a specific one: the translation is machine-produced and unverified.

### 3. The UI labels the translation as auto-translated

The translation is shown by default. The UI renders "auto-translated" or an
equivalent affordance near the cue block, wired off `episode.overlayVerified ===
false`. Wording is deferred to the UI slice; the requirement is that the label is
present and legible.

The label is required, not decorative. An overlay shown without its label is the
failure mode this decision names — a machine translation presented as if it were
human. Dropping it because it clutters the layout would put the catalogue back into
the "technically true and misleading" territory
[ADR 0012](0012-two-directions-and-en-to-en-is-not-one.md) removed a pair to avoid.

## Alternatives rejected

**Hide the translation on `overlayVerified: false`.** This preserves episode 102's
strict-honesty stance and is worse for the learner. A learner who loses the thread in
minute 7 will not work through minute 8 on a Chinese-only transcript, however
scrupulous the omission. The label is the honesty; the crutch is the utility; they
are separable.

**Manually translate 400+ cues per episode.** Roughly 10,000 authored translations
across 24 episodes — a curatorial task this ingest is not doing. When a specific
episode is worth verification, `overlayVerified: true` is the seed change and the
label disappears for that episode. The mechanism supports upgrade; the default is
honest.

## Consequences

**Two overlay shapes coexist.** Verified overlays (none yet; the field is declared in
advance) render without a label. Unverified overlays render with one. One boolean in
the seed, one read in the UI — the smallest surface the honesty label can have.

**The translation is only as good as ElevenLabs.** A mistranslated cue ships in the
seed; a learner reading the label distrusts it and the publisher's Chinese remains
the source of truth. Correcting a specific cue is a manual seed edit that flips
`overlayVerified` to `true` for the episode — a small enough unit to be worth the
work when the line is load-bearing.
