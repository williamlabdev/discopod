# ADR 0008 — Calibrate `cpm` by extrapolation, and label it as extrapolation

- **Status:** Accepted
- **Date:** 2026-09-04
- **Lifts:** [ADR 0004](0004-measure-speech-rate-in-a-declared-unit.md)'s block on `cpm`,
  which was the last thing keeping every Mandarin episode out of every catalogue
- **Corrects:** [ADR 0007](0007-fsi-is-a-pipeline-fixture-not-a-catalogue-source.md)
  decision 5, which named permission as the critical path for the Mandarin direction
- **Weakens, knowingly:** ADR 0004's standard for what may go in that row. See the last
  section — this is the part of the decision to argue with.

## Context

`COMFORTABLE_RATE` holds the rate a learner at each level can comfortably follow. It had
one row, `wpm`, and ADR 0004 made the absence of a `cpm` row load-bearing: an uncalibrated
unit excludes an episode from *every* pair, so no Mandarin episode could appear anywhere,
however good the audio.

ADR 0007 then removed FSI as a candidate source and concluded that the critical path was
correspondence — written permission from a podcaster — because "public domain supplies the
first two and not the third".

**That conclusion does not survive contact with what this table actually is.** ADR 0007's
decision 5 reasoned about *sourcing*: audio we may distribute, a transcript we may
distribute, speech at a natural rate. All three are properties of a recording.
`COMFORTABLE_RATE` is none of them. It is a claim about **listeners**, not about audio: how
fast a Beginner can keep up. No audio source supplies it. A licensed podcast does not
supply it, a public-domain tape does not supply it, and a publisher saying yes does not
move it one inch. So the Mandarin direction was never blocked on permission for *this*
reason, and the letters — worth writing for content — would have arrived to find the same
empty row.

What the row was actually blocked on was somebody deciding.

## Decision

### 1. The row is 170 / 220 / 280, derived by ratio from the English row

```ts
cpm: { Beginner: 170, Intermediate: 220, Advanced: 280 },
```

The English row is not arbitrary relative to English: against a conversational baseline of
~155 wpm, 110 / 145 / 180 sit at 0.71 / 0.94 / 1.16. Mandarin conversational speech at
~240 characters per minute puts those same ratios at 170 / 225 / 280, rounded to
170 / 220 / 280.

The arithmetic is written down here and in `speech-rate.ts` for one reason: so that
disagreeing with the numbers means disagreeing with a specific input — the 155, the 240, or
the premise that the ratios transfer across languages — rather than with three bare
figures. A number you cannot argue with is not a calibration, it is a decoration.

The transferability premise is the weakest link and is named as such. A Mandarin syllable
carries more information than an English one, so it is not obvious that "0.71 of
conversational" means the same cognitive load in both. That is precisely the sort of thing
measurement would settle and extrapolation cannot.

### 2. What ADR 0004 demanded was ownership, not measurement

ADR 0004's requirement, in its own words, is that the row is "a claim someone has to stand
behind". It is met the way any claim is met: a named person, a stated basis, and a form
that can be checked. **William owns these three numbers, 2026-09-04.** They are not a
literature survey and not a study, and this ADR does not dress them as either.

### 3. The extrapolation is labelled where it is used, not only where it is decided

`speech-rate.ts`'s comment carries the derivation, the anchor rates and the owner. An ADR
nobody opens is not a label. Somebody reading the table has to be able to see, without
leaving the file, that `wpm` was inherited and `cpm` was extrapolated — because the two
rows look identical in the source and are not the same kind of knowledge.

### 4. The exclusion machinery is untouched

`COMFORTABLE_RATE` stays `Partial`, `isCalibrated` stays, and `speaksTo` still refuses an
episode whose unit has no row. This ADR fills one row; it does not weaken the rule that an
empty row excludes. The next spoken language added to `RATE_UNIT` arrives excluded by
default and has to be argued in the same way.

## What this ADR does not do

- **It does not measure anything.** No listener was tested. The row is as good as its two
  anchor rates and the ratio premise, and no better.
- **It does not add Chinese audio, a transcript, or a second seed file.** The block is
  lifted; nothing yet walks through it. `catalog.seed.ts` is still hardcoded to
  `SEED_PAIR`, and `GET /episodes` still filters on `speaks` and not `learning` — both are
  work, and both are now the *only* things between here and a Mandarin episode on screen.
- **It does not revive FSI.** ADR 0007's decisions 1–3 stand entirely: FSI is the ASR
  fixture and never catalogue content, and a `cpm` measured off a teaching-speed drill tape
  would still be precise and false. Only decision 5's claim about the critical path is
  corrected.
- **It does not make the permission letters unnecessary.** They were the right next action
  for *content* and remain so. What changes is that they are no longer a prerequisite for
  the ranking to work, so the two can proceed independently.
- **It does not touch `proficiency`.** ADR 0003 decision 7 is still outstanding, now with a
  fifth caller waiting.

## Consequences we accept

- **This lowers ADR 0004's bar, and it was written to resist exactly this.** ADR 0004 says
  the row "may not be invented in passing to unblock a build". The immediate reason this
  row exists is a demo. Stating that plainly is the point: the defence is not that this
  isn't what ADR 0004 warned about, it is that a stated, owned, labelled extrapolation is a
  different object from three plausible numbers typed in to make a build pass — it can be
  checked, attributed and withdrawn. Whether that difference is enough is a judgement, and
  a reader who thinks it isn't is disagreeing with something real.
- **Mandarin episodes now get a suitability score that looks exactly like English's.** The
  UI cannot show that one rests on an inherited row and the other on an extrapolation.
  This is the honest cost, and it is the same failure ADR 0004 was built to prevent — now
  accepted deliberately and in one place, instead of avoided by shipping nothing.
- **The first real measurement will move these numbers, and every Mandarin ranking with
  them.** No score is persisted, so the change is a rebuild rather than a migration.
- **`isCalibrated('cpm')` is now true everywhere,** including in any code that used it as a
  proxy for "we have no Chinese content". Nothing does today; the coupling is worth knowing
  about before something starts to.
