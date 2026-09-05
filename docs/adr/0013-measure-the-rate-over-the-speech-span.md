# ADR 0013 — Measure the rate over the speech span, and ship the publisher's file unmodified

- **Status:** Accepted
- **Date:** 2026-09-05
- **Extends:** [ADR 0004](0004-measure-speech-rate-in-a-declared-unit.md), which declared
  the *unit* of `DifficultyProfile.speechRate` and left the *denominator* undeclared
- **Touches:** [ADR 0010](0010-the-chinese-discopod-teaches-is-traditional.md) — the same
  excerpting and normalising work, one catalogue later

## Context

The catalogue went from two episodes to nine: five more VOA *Let's Learn English* lessons
for `zh-Hant → en`, and two more spoken Chinese Wikipedia articles for `en → zh-Hant`.
Two things that were invisible at n=2 became visible at n=9.

**The rate had a unit but no denominator.** ADR 0004 fixed that a Mandarin rate is `cpm`
and an English rate is `wpm`, which stopped the catalogue comparing characters against
words. It did not say what the number is divided by. Three plausible denominators were in
use across the seven rows written since:

- the file's full duration,
- the *speech span* — first speech onset to last speech offset, so internal pauses count
  but leading and trailing silence do not,
- speaking time with all pauses removed.

They disagree by up to 10% on this material, and more than that on a file with a long
musical tail. Five of the seven rates in the seed did not reproduce under any single one of
them, because they had been written under different ones: Lesson 2 claimed 120 wpm and
measures 112; Lesson 5 claimed 100 and measures 97; Lesson 6 claimed 84 and measures 83;
鄧福如 claimed 177 cpm and measures 172; 吳宗憲 claimed 178 and measures 173.

That is the ADR 0004 failure repeating one level down. A rate whose denominator is
unstated is not comparable across rows, and speech rate is 0.4 of the suitability score —
the heaviest term in the only number this product exists to produce.

**The publisher's files vary by 8 dB.** VOA's own mastering drifts across the series:
integrated loudness runs from −25.2 LUFS (Lesson 1) to −17.1 LUFS (Lesson 5). The two new
Mandarin excerpts had to be loudness-normalised anyway — they are excerpts, so they are
already derivative works — which made it tempting to normalise everything to one target
and have a catalogue that plays at one volume.

## Decision

1. **A rate is measured over the speech span.** Words, or Han characters with digits
   excluded, divided by the interval from first speech onset to last speech offset
   (`ffmpeg silencedetect`, −40 dB, 0.3 s). Internal pauses are in; leading and trailing
   silence is out.

   Internal pauses are in because they are the thing that makes a fast recording followable
   — a 173 cpm reading with a pause on every semicolon is easier than a 172 cpm reading with
   none, and the score should not be blind to the difference. Leading and trailing silence
   is out because it is an artefact of where somebody cut the file, and it would make the
   same speech score differently depending on the trim.

2. **Every rate already in the catalogue is recomputed under it**, and the prose in
   `levelReason` that quoted the old numbers moves with them. A number and a sentence that
   disagree are worse than either alone.

3. **The pause statistics are published next to the rate**, in `ATTRIBUTION.md`: pause count
   and total silence at a stated threshold. The rate alone under-describes the material, and
   the threshold matters — 鄧福如 has an audible room floor near −40 dB, so its pause count
   triples between a −40 dB and a −30 dB threshold. A pause statistic without its threshold
   is not a measurement.

4. **A publisher's file ships unmodified when it can.** The five VOA lessons are the
   publisher's own MP3, byte for byte, verified by `content-length` against the source URL.
   The 8 dB spread is recorded in `ATTRIBUTION.md` rather than corrected.

5. **Excerpts are normalised, and dynamically when linear would clip.** 鄧福如 measures
   `input_i −25.60 LUFS` against `input_tp −7.56 dBTP`: +9.6 dB of gain wanted against
   7.6 dB of headroom, so a linear gain clips. 吳宗憲 is the same shape. Dynamic
   normalisation alters the internal level relationships of a recording, so it is declared
   as a modification under BY-SA — not filed under transcoding, which is what 海山漁港's
   linear normalisation could fairly have been.

## Consequences

**Rates are now reproducible from the shipped files.** Anyone can take an episode's audio
and its VTT and recover the number in the seed. That is the property ADR 0004 wanted and
did not quite get.

**Volume is uneven, deliberately.** A learner moving from Lesson 1 to Lesson 5 will reach
for the volume control. This is the cost of decision 4 and it is a real one. It is
reversible the day the player grows a gain control — normalising at playback time costs
nobody their unmodified file.

**Public-domain status is not a reason to modify.** VOA material may be modified freely;
that is what makes decision 4 a choice rather than a constraint. The reason to leave it
alone is that the shipped bytes then have a checkable provenance — a hash that matches the
publisher's — and a catalogue whose files are all "somebody else's recording, changed by us
in ways listed here" is worth more than one that plays at a uniform volume.

**This does not fix `cefr`.** The field is still misnamed for Mandarin rows (HSK or TOCFL,
not CEFR) — ADR 0003 decision 7, still open, now with three Mandarin episodes behind it
instead of one.
