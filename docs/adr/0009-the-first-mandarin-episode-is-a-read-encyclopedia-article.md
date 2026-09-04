# ADR 0009 — The first Mandarin episode is a read encyclopedia article, not a podcast

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Builds on:** [ADR 0008](0008-calibrate-cpm-by-extrapolation-and-label-it.md), which
  made a `cpm` episode rankable at all
- **Strains, knowingly:** [ADR 0007](0007-fsi-is-a-pipeline-fixture-not-a-catalogue-source.md)
  decision 1 — "nothing enters it that the product would not choose on its merits". A
  spoken Wikipedia article is not a programme. See the last section; that is the part to
  argue with.
- **Forces open:** [ADR 0003](0003-model-the-learner-language-pair.md) decision 7
  (`cefr` as a field name), and **deviates from** its decision 2 in one field —
  `description`. See decisions 6 and 7.

## Context

After ADR 0008 the catalogue could rank a Mandarin episode and had none. The immediate
need was a demo with Chinese on screen; the standing constraint is that a demo may not
put anything in the catalogue that the product would be embarrassed to keep.

TED 中文 was the obvious candidate and was rejected on licence: CC BY-NC-**ND**. A
transcript-first player that excerpts, re-times and annotates an episode is squarely a
derivative work, so ND forbids the only thing this product does. That is a licence read,
not a preference, and it removes the whole of TED's Chinese library, not one talk.

What was left that is both freely licensed and actually spoken by a person is
**Spoken Wikipedia** — volunteers reading articles aloud, published on Commons under
CC BY-SA. The chosen recording is `File:Zh-tw-大雁塔.ogg`, read by the volunteer
**Yu chuan**: the opening paragraph of the Chinese Wikipedia article on the Giant Wild
Goose Pagoda in Xi'an. It ships as episode **101** in
`apps/api/src/catalog/data/catalog.zh-Hans.seed.json`, pair `en → zh-Hans`.

## Decision

### 1. It enters the catalogue, and the mismatch with ADR 0007 is recorded rather than argued away

ADR 0007 decision 1 asks that catalogue content be something the product would choose on
its merits. **A read-aloud encyclopedia article is not a programme, and the product would
not choose it if podcasts were available.** Nobody produced it as listening material;
there is no host, no interlocutor, no natural conversational rhythm. It is one voice
reading written prose, and written prose is a different register from speech — which is
precisely the register a learner listening to podcasts is *not* trying to learn.

It goes in anyway, with three things true of it that FSI's tapes were not:

- **The delivery is natural.** Yu chuan reads at his own pace, not at a teaching pace. ADR
  0007's objection to FSI was that a drill tape's rate is an artifact of pedagogy, so a
  `cpm` measured off it is precise and false. That objection does not reach here: the
  measured 140 cpm is what one person actually sounds like reading aloud.
- **The licence permits what the product does.** CC BY-SA allows the excerpt, the
  re-timing and the annotation, with attribution and share-alike. That is the exact
  permission ND withheld.
- **It is not standing in for something better.** FSI would have been catalogue content
  pretending to be a podcast. This is honestly labelled as what it is, in the show title
  (中文维基百科有声条目), the episode title (大雁塔（条目导言）) and the description.

The honest summary is that this is a **floor**, not a first pick, and the caveat belongs in
writing where a later reader can weigh it rather than inherit it silently.

### 2. A show may carry an explicit `showId`

`slug()` keeps `[a-z0-9]`, which returns the empty string for 中文维基百科有声条目. The
alternatives were both worse — transliterating to pinyin is a guess of the kind ADR 0006
forbids for scripts, and hashing the title yields an id no human can read in a URL or a
palette key. So `SeedRow.showId` is optional data, and an empty derived id now throws with
a message that names the fix.

This also repairs something that was always fragile: ids join the API to the web app's
palette table, and deriving them from prose meant retitling a show would silently move
every episode to a new id.

### 3. A show may carry a `licence`, and it is data, not decoration

`Show.licence` is `{ name, url }`, optional, rendered next to the credit line. A link to
the source credits the author; it does not state the terms, and under share-alike those
are **two separate obligations**. Naming the licence is a condition of using the audio at
all, so it is a fact about the show.

Optional, because "no licence stated" and "public domain" are different answers and
neither may be invented. A show without one renders the credit line it always rendered.
The alternative — folding the licence into `publisher` — is a field that means two things,
which is the defect this repo keeps writing ADRs against.

### 4. The transcript is the published text, corrected by the audio, and `verifiedLesson` is false

The cue text comes from Chinese Wikipedia revision **36492554** (2015-07-24). The timings
come from ASR (`mlx-whisper` large-v3-turbo) run against the shipped mp3, not against the
source file, so they are measured on the artifact a learner actually hears.

The published text corrected the ASR's homophones (大祠恩寺→大慈恩寺, 永辉→永徽, 市辉→市徽,
玄帐→玄奘). **And the ASR corrected the published text once:** at 00:43 the reader says
而遭多次毁损, where the article reads 而多次遭到损毁. Three independent decodes agree, at
ordinary confidence. That cue carries **what was spoken**, because a transcript is a
transcript of the audio; the published text's job is to check the ASR, not to replace it.
That is `apps/api/src/ingest/README.md`'s rule working in both directions.

`verifiedLesson: false`, therefore `publisherTranscript: false` on the page. Wikipedia
published the text; nobody published a *timed* transcript, the timings are machine, and one
cue departs from the published text. Calling that a publisher transcript would be
technically arguable and misleading, and this repo's standing instinct is that the pair
"technically true and misleading" resolves to false.

### 5. Both source discrepancies are recorded, not smoothed

`apps/web/public/audio/ATTRIBUTION.md` carries them:

- **Which revision was read.** Commons names oldid 38160572; the reader says aloud he read
  the 2015-07-24 version. The history settles it: 38160572 is 2015-11-30, by Yu chuan
  himself, and the only difference from its parent 36492554 is the `{{Spoken Wikipedia}}`
  template he added after recording. The prose is byte-identical, so nothing turns on the
  choice — 36492554 is cited because it is the one he named and the one that existed when
  he read it.
- **Which licence version.** The Commons file page states CC BY-SA 4.0; the recording says
  3.0 aloud. Both are recorded; the page names 4.0, the file page's own claim.

Neither is load-bearing today. Both are the kind of thing that becomes load-bearing
exactly when nobody can remember it, which is the argument for writing it down at the time.

### 6. `cefr: "B1"` on a Mandarin episode is ADR 0003 decision 7's defect arriving for real

ADR 0003 decision 7 flagged that a field literally named `cefr` presumes one scale.
Episode 101 makes that concrete: **CEFR is arguably the wrong scale for Mandarin**, where
HSK is the conventional answer and CEFR alignment is contested rather than agreed.

The value stays `"B1"` for this episode. It is an owned judgement in ADR 0008's style —
Wikipedia's opening paragraph is roughly B1 comprehension for a learner who has the
vocabulary — and it is labelled here as a judgement rather than a lookup. What it is *not*
is a reason to rename the field in the same change that ships the first Mandarin episode:
`proficiency: { scale, level }` is a schema change across API, web and every seed row, and
doing it under demo pressure is how a schema change gets done badly. Decision 7 now has a
sixth caller waiting and its first genuinely wrong answer.

### 7. `description` is written in English, knowingly against ADR 0003 decision 2

ADR 0003 decision 2 classifies `description` explicitly: *"unchanged, scalar, in the show's
language"*. Episode 101's show speaks Mandarin. **Its description is in English, and that
is a deviation, not an oversight.**

Every other scalar on this row complies — the show title 中文维基百科有声条目, the episode
title 大雁塔（条目导言）, every `term`, every `example` is in the show's language. The
description is the one that does not, because it is the one whose *job* is different. A
description is prose written **about** the episode to help someone decide whether to press
play. It is read before listening, by definition by someone who cannot yet follow the
audio. A Mandarin blurb on a Mandarin episode is unreadable to precisely the learner the
card exists for.

ADR 0003 put `description` in the show-language column at a moment when every show was
English, so the two answers could not differ and nothing tested the choice. This is the
same shape as the unstated default ADR 0003 was itself written to remove, and as ADR 0004's
`wpm`: an assumption that was invisible while the catalogue was monolingual. Episode 101 is
the first case where the columns disagree, and it says the classification is wrong — the
field belongs in `Localized`, keyed by the learner's language, alongside `learningGoal`,
which it sits next to on the page and is written for the same reader.

**That change is not made here.** `Episode.description` and `Show.description` are scalar
across the API types, the seed loader, the web mirror, `assertEpisode` and every seed row,
and doing that migration in the change that ships the first Mandarin episode is the same
mistake as renaming `cefr` in it. So the row deviates, visibly, in one field, and the
deviation is written down where the migration can start from it rather than discovered as
a bug. The immediate cost is bounded: `en → zh-Hans` is the only pair episode 101 appears
in, and English is that pair's `speaks`, so today the wrong classification and the right
language coincide. A `zh-Hant → zh-Hans` pair would break that with nothing in the type
system to say so.

## What this does not do

- **It does not make Spoken Wikipedia the ingestion strategy.** One episode, hand-built, to
  prove the pipeline end to end. `apps/api/src/ingest/data/sources.seed.json` is untouched.
- **It does not revive FSI.** ADR 0007 decisions 1–3 stand. The distinction that lets this
  episode in — natural delivery — is exactly the one FSI fails.
- **It does not weaken the ADR 0006 script rule.** Nothing was converted between Hant and
  Hans. The recording's Commons filename says `Zh-tw`; the article read is on the Simplified
  wiki and the text is Simplified, so the episode is `zh-Hans` because that is what the
  transcript is written in, not because of anything inferred from the filename.
- **It does not touch the `en → en` catalogue.** Episode 101 has its own id range, and the
  `learning` filter keeps it off the English pages.

## Consequences we accept

- **The demo's Chinese content is an encyclopedia paragraph, and it sounds like one.**
  A viewer who assumes the catalogue is podcasts will find one entry that is not, and the
  page says so honestly rather than dressing it up. The fix is better content, not better
  wording.
- **The vocabulary is harder than the delivery**, which is why the level is Intermediate
  though 140 cpm sits below the Beginner threshold of 170. The `levelReason` states both
  halves, so the ranking's headline number and its explanation can be checked against each
  other. This is also the first evidence that speech rate alone does not carry the level.
- **`suitability: 91` for this episode rests on ADR 0008's extrapolated `cpm` row.** It
  renders identically to a score computed against the inherited English row, and the UI
  cannot show the difference. That cost was accepted in ADR 0008 and is now being paid.
- **One episode means `previousId === nextId === '101'`** — the pair's navigation links back
  to itself. Correct per `loadEpisodeDetail`, and visibly thin.
- **The measured 140 cpm is delivered rate, not articulation rate.** Excluding the 36
  pauses (21.1% of the recording) would give ~175 cpm. Delivered rate was chosen because
  `COMFORTABLE_RATE` asks how fast a learner can *follow*, pauses are processing time, and
  ADR 0008's VOA spot-check measured against wall clock — so the two are comparable. A
  later decision to switch to articulation rate must move both, or the table stops meaning
  one thing.
