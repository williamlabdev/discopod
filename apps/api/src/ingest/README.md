# Ingestion sources

`data/sources.seed.json` is a list of **shows to ingest from**, not a catalogue.

Nothing reads it yet. It is here so that the ingestion work described in
[docs/VISION.md](../../../../docs/VISION.md) — "transcripts come from RSS metadata where
publishers supply them" — starts from a vetted list rather than from a search.

## What it is not

It is not a second `catalog.seed.json`, and the two must not be confused:

| | `catalog/data/catalog.seed.json` | `ingest/data/sources.seed.json` |
|---|---|---|
| Grain | episodes | shows |
| Serves | the API's `/shows` and `/episodes` | nothing yet — input for ingestion |
| Has | transcripts, vocabulary, questions, profiles | RSS URLs and hand-written notes |
| Difficulty | `Beginner` / `Intermediate` / `Advanced` | `easy` / `intermediate` / `hard` |

The difficulty vocabularies deliberately differ, because the values are not the same kind of
claim. `catalog.seed.json` carries a computed `DifficultyProfile`; this file carries a human's
first impression of a show, useful for choosing what to ingest and not for ranking anything.
Ingestion must derive a real profile rather than mapping one column onto the other.

## Verified, 2026-09-04

Three of the eleven feeds were fetched. Each item really does carry `<podcast:transcript>` in
three formats, and a signed transcript URL really does resolve — 200, 19 KB of WebVTT with
speaker labels and millisecond cues.

    brainstuff              155 items / 462 transcript tags
    stuff-you-should-know   187 / 558
    the-daily-zeitgeist      97 / 285

## Constraints to design ingestion around

- **One network.** All eleven shows are iHeart / Omny. That is a single point of failure for
  the whole catalogue, and a narrow editorial range. Treat the feed list as needing to grow
  beyond one publisher before it carries the product.
- **Transcript URLs cannot be cached.** They carry a signed `?t=` token. Re-fetch the RSS and
  take the URL from it each time; do not persist the URL and expect it to keep working.
- **All English.** VISION says a language pair is symmetric or it isn't a pair. This list only
  serves learners going *into* English, so it cannot be the whole story.
- **The transcripts are machine-generated.** `<v Speaker 1>` is diarization, not real speaker
  names. Setting `publisherTranscript: true` from this source would be technically true and
  misleading — the flag reads as "a human checked this".

Licensing has not been assessed. Reading a public RSS feed and redistributing a publisher's
transcripts and audio inside an app are different things, and that question is open.

## The Mandarin fixture — not a source

There is no Mandarin audio in this list and there is none in the catalogue. What exists is
a **test fixture** for the ASR and alignment pipeline, decided in
[ADR 0007](../../../../docs/adr/0007-fsi-is-a-pipeline-fixture-not-a-catalogue-source.md):
FSI's *Standard Chinese*, a US government work in the public domain.

It is a fixture and never a catalogue source. Do not seed it into `catalog.seed.json`, and
do not take a `cpm` measurement from it — it is 1970s language-lab audio read at teaching
speed, so the rate is real and means the wrong thing.

ADR 0004's block on `cpm` was lifted on 2026-09-04 by
[ADR 0008](../../../../docs/adr/0008-calibrate-cpm-by-extrapolation-and-label-it.md), which
filled the row by extrapolation from `wpm` rather than from any recording. That does not
change the sentence above: FSI is still not where a rate comes from.

Two tapes, chosen because they are continuous connected speech rather than drill:

    archive.org item  FSIStandardChinese
      FSI - Standard Chinese - Module 09 LIC - Unit 05 - Tape 1.mp3   27 min, 0 pauses >=0.5s
      FSI - Standard Chinese - Module 09 LIC - Unit 03 - Tape 2.mp3   17 min, 1 pause

    archive.org item  FSI-StandardChinese-StudentTexts
      34 PDFs. Unaligned — no timings, no per-tape mapping. For checking ASR
      output by hand, not for building cues from.

Most of the course is not like this. The drill tapes are 40–51% silence with speech
arriving in 1–2 second fragments, because the silence is the gap the student speaks into.
Measure before assuming any other tape is usable:

    ffmpeg -i TAPE.mp3 -af silencedetect=noise=-30dB:d=0.5 -f null - 2>&1 | grep silence_

The audio is deliberately not committed — ~40 MB, re-fetchable from a stable mirror.

## ASR: what has actually been run

The fixture had no consumer when ADR 0007 named it. There is now a working recipe, proven
on a different file (a 16m40s VOA Chinese interview, not on FSI):

    python3.12 -m venv venv          # 3.14 has no mlx wheels yet
    ./venv/bin/pip install mlx-whisper
    ./venv/bin/mlx_whisper --model mlx-community/whisper-large-v3-turbo \
      --language zh --task transcribe --output-format json AUDIO.mp3

On Apple Silicon this transcribed 16m40s in **22.8 s**, with per-segment timings — which is
the half of the problem a published script does not solve. A source that publishes its own
transcript is still worth much more than one that does not, because then ASR supplies the
timings and the publisher's text checks the words. Neither alone is enough.

Not yet run against the FSI fixture. When it is, the 34 unaligned student-text PDFs are how
the output gets checked — by hand, by eye, as ADR 0007 says.
