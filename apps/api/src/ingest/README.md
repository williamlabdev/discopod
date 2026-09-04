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
