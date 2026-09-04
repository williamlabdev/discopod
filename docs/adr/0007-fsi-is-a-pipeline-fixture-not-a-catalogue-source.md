# ADR 0007 — FSI's public-domain tapes are a pipeline fixture, not a catalogue source

- **Status:** Accepted
- **Date:** 2026-09-04
- **Closes** the FSI question left open by
  [ADR 0005](0005-generated-learner-support-is-a-build-artifact.md) decision 4 and recorded
  as a finding in [ADR 0006](0006-separate-spoken-language-from-written-form.md)
- **Does not lift** [ADR 0004](0004-measure-speech-rate-in-a-declared-unit.md)'s block on
  `cpm`. It removes the one candidate that looked like it might

## Context

Every pair the app can serve today has `learning: 'en'`. The other direction — a learner of
Mandarin — needs audio that is spoken in `cmn`, a transcript in `zh-Hant` or `zh-Hans`, and
three numbers for `COMFORTABLE_RATE.cpm` that somebody is willing to stand behind. None of
the eleven feeds in `ingest/data/sources.seed.json` is Mandarin; all eleven are English, on
one network, and the ingest README already says so.

FSI's *Standard Chinese* was the obvious candidate, and for one good reason. ADR 0005
decision 4 found that the lever controlling what this app may distribute is **the audio
source's licence**, not anything about generation timing. FSI's course is a US government
work in the public domain, mirrored complete on archive.org
(`FSIStandardChinese`, 932 files, 309 MP3s; texts separately at
`FSI-StandardChinese-StudentTexts`, 34 PDFs). It is the only Mandarin audio available to
this project that needs no permission from anybody.

So it was measured rather than assumed. Six tapes were downloaded and run through
`ffmpeg silencedetect` at two thresholds — a fixed `-30 dB`, and an adaptive one at each
file's own `mean_volume − 12 dB`, so that a quietly-mastered tape is not scored as silent
by the threshold rather than by its content.

| Tape | Length | Silence | Speech segments | Median segment |
| --- | ---: | ---: | ---: | ---: |
| Module 01 ORN, Unit 01, Tape 1C-1 | 24 min | 51% | 512 | 1.0 s |
| Module 05 TRN, Unit 05, Tape 5C-2 | 14 min | 45% | 279 | 1.6 s |
| Module 08 TVL, Unit 04, Tape 2 | 18 min | 40–43% | 326–343 | 1.4–1.5 s |
| Module 09 LIC, Unit 08, Tape 2 | 17 min | 11% | 121 | 3.9 s |
| Module 09 LIC, Unit 03, Tape 2 | 17 min | ~0% | 2 | — |
| Module 09 LIC, Unit 05, Tape 1 | 27 min | 0% | 1 | — |

**The result is not the one the earlier note recorded, and it splits in two.** ADR 0006
says FSI's tapes are "40–51% silence by construction, with the Mandarin arriving in 1–2
second drill fragments". That is exactly right for the drill tapes in the top three rows,
where the silence *is* the pedagogy — it is the gap the student speaks into — and it is
wrong as a statement about the course. Module 09's tapes are continuous connected speech:
Unit 05 Tape 1 runs 27 minutes without a single detected pause of half a second or more.

The corrected finding is therefore stronger, not weaker. FSI does contain long stretches
of unlicensed, continuous, transcribable Mandarin. It still must not become catalogue
content, and the reasons have nothing to do with silence:

**There is no aligned text.** The audio is one archive.org item and the student texts are
another — 34 PDFs, no timings, no per-tape mapping. Producing `TranscriptCue[]` from that
means running ASR and then reconciling the output against a PDF by hand. That is the
ingestion pipeline's whole job, not a shortcut around it, and a catalogue row built that
way would be an ASR output with a public-domain label on it.

**The rate it would calibrate is the wrong rate.** `COMFORTABLE_RATE` states what a
learner at a level can follow in *running speech*, and ADR 0004 blocks `cpm` because
nobody can yet stand behind those numbers for Mandarin. A `cpm` measured off module 09
would be arithmetically fine and substantively false: these are deliberately paced
language-laboratory recordings made for the Foreign Service in the 1970s. A number taken
from them describes a drill tape read at teaching speed. That is worse than the current
absence, because ADR 0004's position is that an uncalibrated unit is an honest exclusion —
a *mis*-calibrated one is the fabricated signal this repo refuses to ship.

**It is not a podcast.** VISION ranks episodes by whether a learner can follow them by ear,
among episodes a learner would want to hear at all. A 1970s diplomatic-service drill tape
fails the product test before it reaches any technical one, and shipping it because it was
free is how a catalogue starts being organised around what was cheap to obtain.

## Decision

### 1. FSI never enters `catalog.seed.json`

Not as a seeded episode, not as a temporary row, not behind a flag. The catalogue's single
source stays what `CLAUDE.md` says it is, and nothing enters it that the product would not
choose on its merits.

> **Strained by [ADR 0009](0009-the-first-mandarin-episode-is-a-read-encyclopedia-article.md)**
> — the first Mandarin episode is a Spoken Wikipedia reading, which the product would not
> choose over a podcast. It is admitted on the distinction FSI fails, that the delivery is
> a person's own pace rather than a teaching pace, and the mismatch with this sentence is
> recorded there rather than argued away. Decisions 1–3 are otherwise untouched: FSI stays
> the fixture and never catalogue content.
>
> **The strain outlived that episode.** ADR 0009 was superseded by
> [ADR 0010](0010-the-chinese-discopod-teaches-is-traditional.md) and episode 101 deleted,
> but its replacement — episode 102, 海山漁港 — has the same shape: one person reading an
> encyclopedia article. Changing the script did not discharge this objection, and ADR 0010
> inherits the confession whole rather than restating it as solved. Two attempts in, the
> reading is that freely-licensed Mandarin *programmes* are the scarce thing, not
> freely-licensed Mandarin audio.

### 2. FSI becomes the fixture for the ASR and alignment pipeline

This is a promotion of a sort, and it is what the module 09 finding buys. Building an
ASR-plus-alignment path needs Mandarin audio to point at long before it needs *good*
Mandarin audio, and the properties that make module 09 useless as content make it close to
ideal as a fixture: continuous connected speech, tens of minutes of it, a known written
source to check the output against, zero licence encumbrance, and a stable public URL.
Nobody has to be asked, and nothing has to be paid for, to find out whether the pipeline
works.

The two named tapes are the fixture:

```
archive.org item: FSIStandardChinese
  FSI - Standard Chinese - Module 09 LIC - Unit 05 - Tape 1.mp3   27 min, continuous
  FSI - Standard Chinese - Module 09 LIC - Unit 03 - Tape 2.mp3   17 min, one pause
texts (unaligned, for checking ASR output only):
archive.org item: FSI-StandardChinese-StudentTexts
```

Recorded in `apps/api/src/ingest/README.md` alongside the sources list, because that is
where somebody looking for "what do I point the ingester at" will look.

### 3. What gets committed is the recipe, not the audio

The measured MP3s are ~40 MB and they are re-downloadable from a stable public mirror. The
item identifiers, the file names and the measurement method go in the repo; the bytes do
not. A fixture that can be re-fetched in one command is worth more than one that inflates
every clone.

### 4. `COMFORTABLE_RATE.cpm` stays absent, and FSI is now formally ruled out

ADR 0004's block is untouched. What changes is that it can no longer be waved at FSI as an
imminent answer. The unit stays uncalibrated, every Mandarin episode stays excluded from
every catalogue, and the exclusion stays loud.

> **Overtaken by [ADR 0008](0008-calibrate-cpm-by-extrapolation-and-label-it.md),
> 2026-09-04.** The row was filled by extrapolation from `wpm`, not by measurement and not
> from any recording. FSI stays ruled out on exactly the grounds above — a rate taken from
> a teaching-speed drill tape would still be precise and false. What this decision got
> wrong is only its assumption that the row was waiting on a *source*.

### 5. The critical path for the Mandarin direction is permission, not engineering

> **Corrected by [ADR 0008](0008-calibrate-cpm-by-extrapolation-and-label-it.md),
> 2026-09-04.** Two errors, and the second is the one that cost time. First, "public domain
> cannot supply natural running speech" was generalised from FSI to the whole public
> domain, and is false of it — VOA's Chinese output is a US government work and is running
> speech. Second, and worse: `COMFORTABLE_RATE` is a claim about *listeners*, not about
> recordings, so no source of any licence was ever going to supply it. This decision put
> a correspondence deadline in front of a row that only needed somebody to decide. The
> letters are still worth writing, for content; they were never the blocker they are
> described as here.

The first Mandarin catalogue row needs three things at once: audio we may distribute, a
transcript we may distribute, and speech that is actually running speech at a natural
rate. Public domain supplies the first two and not the third. A real podcast supplies all
three, and only with its publisher's agreement.

So the next action on this axis is correspondence, not code: written permission from
Taiwanese Mandarin podcasters. This moves to the top of the next steps in `HANDOFF.md`,
above persistence, because it is the item with a human reply time in front of it and
everything else on the Mandarin direction queues behind it.

Taiwanese Mandarin rather than mainland, deliberately: the app's second declared pair is
already `zh-Hant → en`, `zh-Hant` is the script that pair reads, and ADR 0006 forbids
converting Hant↔Hans to manufacture the other. Serving the readers we have declared is a
smaller step than acquiring a new script at the same time as a new language.

## What this ADR does not do

- **It does not write any ingestion code.** There is still no ASR pipeline, no aligner and
  no consumer for the fixture. This decides what the fixture is *for*, so that the first
  person to build one does not spend a day discovering that the drill tapes are drill
  tapes.
- **It does not choose the shows.** Cozy Mandarin, Convo Chinese and Learn Taiwanese
  Mandarin are leads, not decisions. Which shows are approached, and on what terms, is a
  content and licensing question that belongs in the correspondence, not in an ADR.
- **It does not add anything to `sources.seed.json`.** That file lists shows to ingest
  *into the catalogue* from. The fixture is a different kind of object and putting it there
  would recreate exactly the confusion the ingest README exists to prevent.
- **It does not calibrate `cpm`, add pinyin or zhuyin, or touch `proficiency`.** All three
  remain where ADR 0006 left them.

## Consequences we accept

- **The Mandarin direction is now blocked on somebody answering an email.** That is a
  genuine schedule risk and stating it is the point. Keeping FSI on the board as a
  plausible-looking fallback would have hidden it behind work that could be started
  immediately and would never have finished.
- **The measurement artifacts are lost.** They live in a session scratchpad, not the repo.
  The table above and the recipe in decision 3 are what survives, which is why both record
  the method and not just the conclusion.
- **The fixture has no consumer.** Same shape as `writtenFormsOf` in ADR 0006: it is
  written down now so that the note is present at the moment somebody reaches for it,
  rather than discovered again from scratch.
- **ADR 0006's FSI sentence is left standing and corrected here rather than edited away.**
  It was a true statement about the tapes that had been measured at the time and a false
  generalisation about the course. Overwriting it would delete the evidence that the
  earlier conclusion was reached honestly and then revised.
