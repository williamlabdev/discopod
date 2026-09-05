# ADR 0010 — The Chinese DiscoPod teaches is Traditional

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Supersedes:** [ADR 0009](0009-the-first-mandarin-episode-is-a-read-encyclopedia-article.md).
  Its episode is gone; three of its decisions survive it and are restated here as decisions
  4, 5 and 6, because they were about the *pipeline*, not about that recording.
- **Closes:** ADR 0009 decision 7 — `description` moves into `Localized`, which is the
  migration that decision said it was deferring.
- **Builds on:** [ADR 0006](0006-separate-spoken-language-from-written-form.md), which gave
  the vocabulary to state this at all, and
  [ADR 0008](0008-calibrate-cpm-by-extrapolation-and-label-it.md).
- **Still strains:** [ADR 0007](0007-fsi-is-a-pipeline-fixture-not-a-catalogue-source.md)
  decision 1. The replacement episode has the same shape as the one it replaces — one
  person reading an encyclopedia article — so ADR 0009's confession is inherited whole,
  not discharged. See "Consequences we accept".
- **Leaves open:** [ADR 0003](0003-model-the-learner-language-pair.md) decision 7
  (`cefr` as a field name). Sixth caller, still waiting.

## Context

ADR 0009 shipped episode 101 — a Spoken Wikipedia reading of the article on the Giant Wild
Goose Pagoda — in the pair `en → zh-Hans`. Nothing in that ADR chose Simplified. The
recording was picked because it was freely licensed and naturally delivered; the script it
happened to be written in came along with it, and ADR 0009 noted only that the episode was
`zh-Hans` "because that is what the transcript is written in".

That was a description of a recording. It was never a decision about the product, and
because it was never made as a decision, the product acquired one by default: the only
Chinese a learner could study in DiscoPod was Simplified.

**That is the wrong default for this product.** DiscoPod is for English speakers learning
Chinese, and the Chinese it teaches is Traditional. That is a product decision, not a
technical one, and it is being written down now precisely because the alternative was
never argued for — it was inherited from a file on Commons.

ADR 0006 already forbids the cheap escape. Hant↔Hans conversion is many-to-one and a
guess, so there is no converting episode 101 into a Traditional episode; a Traditional
catalogue needs Traditional sources.

## Decision

### 1. The catalogue's Chinese is `zh-Hant`, and `zh-Hans` content is removed rather than kept

`catalog.zh-Hans.seed.json` is deleted, with episode 101, its mp3, its VTT and its
attribution section. The `en → zh-Hans` pair disappears from `/pairs` because pairs are
derived from content (ADR 0002, `CatalogService.listPairs`), so the route disappears from
the site on the next build with nothing else changing. That derivation is what makes this
a deletion rather than a migration.

The alternative was to keep 101 and add a Traditional episode beside it — one more pair,
no work thrown away. It is rejected because the catalogue would then offer a learner a
choice the product does not mean to offer, and offering it is a claim: that DiscoPod has
a Simplified catalogue worth studying. One episode is not a catalogue. Shipping it as one
is the "technically true and misleading" pairing that this repo resolves to false.

`LanguageTag` keeps `zh-Hans`. The type describes what written forms *exist*, not what the
catalogue stocks, and a learner-language tag is also a `speaks` value — a Simplified reader
learning Traditional is a coherent pair this decision does not rule out.

### 2. `Episode.description` is `Localized`; `Show.description` stays scalar

ADR 0009 decision 7 argued the case and declined to do the migration under demo pressure.
The argument is unchanged and is not re-litigated here: a description is prose written
**about** an episode, read *before* listening, by definition by someone who cannot yet
follow the audio. It belongs beside `learningGoal`, keyed by the learner's language, and
it is now there — through the API types, the seed loader (`authoredIn`), the overlay, the
web mirror, `assertEpisode` and `pick()`, on the same missing-key-is-exclusion rule as
every other `Localized` field (ADR 0003).

`assertEpisode` checks `description[speaks]` by name, and the comment there says what an
API still sending a bare string is: one from before this ADR, when the blurb was written in
the one language its reader is known not to have.

> **Amended by [ADR 0021](0021-an-episode-nobody-described-ships-without-a-description.md),
> 2026-09-05.** The field is no longer *required*. Everything above still holds for a
> description that exists — `Localized`, learner-keyed, missing key is an exclusion — but
> an episode nobody wrote one for now ships without the field, and `assertEpisode` checks
> the key only when the field is present. Making it required is what caused the ingest to
> generate one, and the generated one was the first sentence of the title on the English
> side and a translated jingle on the Vietnamese side.

**`Show.description` is deliberately left scalar.** Nothing renders it today, and the
overlay mechanism is keyed by episode id, so there is no file shape that could translate it
even if something did. Migrating it now would add a `Localized` field with no writer and no
reader — a schema change that means "we thought about it" rather than one that carries
information. When a show blurb reaches a page, it gets this same treatment and this same
argument; until then the scalar records that the question has not come up.

### 3. Seed files are named by pair, not by language

The new file is `catalog.en-zh-Hant.seed.json`, and `SEED_FILES` maps each file to the
pair it serves.

Naming by language read better and was wrong: `catalog.zh-Hant.seed.json` would have sat in
the same directory as `catalog.zh-Hant.json`, differing by four characters and meaning
something unrelated. The overlay is a zh-Hant *explanatory layer* over episodes in some
other language — the `speaks` axis. A seed file is a catalogue for one `speaks → learning`
combination. Two axes, near-identical names, in one directory is a trap laid for whoever
edits next.

`catalog.seed.json` keeps its bare name: it is the base catalogue, its pair is `SEED_PAIR`,
and `SEED_PAIR` is the constant the loader is written against.

### 4. Episode 102 is `File:Zh-海山漁港.ogg`, and the Traditional claim is evidenced, not assumed

The replacement is the opening paragraph of the Chinese Wikipedia article on **海山漁港**,
a working harbour of fishing rafts and sampans on the Hsinchu coast, read by **Yuriy
kosygin** — the volunteer who wrote the article. 84 seconds, CC BY-SA 4.0, source text
revision **31977329** (2014-07-22).

The search for it turned up one corpus-level fact worth more than the episode: **the
`Zh-tw-` prefix on Commons records the narrator's accent, not the script.** Spoken Chinese
Wikipedia is overwhelmingly Simplified-authored, and several `Zh-tw-` files read Simplified
articles. Filename evidence is therefore no evidence at all, which is the same failure mode
ADR 0006 names — inferring a written form from something that is not one.

So the claim is evidenced four ways, in the article rather than the filename:

- Traditional forms throughout, with no Simplified form anywhere in the source wikitext.
- No `{{NoteTA}}`, the template a converted or conversion-managed article carries.
- The markup `海山-{里}-`, which **suppresses** automatic conversion of a single character.
  A Traditional author defending 里 from being converted is the strongest signal available;
  a machine-converted article would have no reason to carry it.
- Its cited sources are Taiwanese government fishery publications.

This is deliberately a higher standard than ADR 0009 applied to episode 101, where the
script was noticed rather than chosen. Once a written form is a product decision, the
evidence for it is part of admitting the content.

### 5. The transcript's characters come from the published text; the ASR only supplies timings

Restated from ADR 0009 decision 4, and now load-bearing in a way it was not there.

`mlx-whisper` decodes Mandarin into **Simplified**. Using its output as cue text would
silently destroy the one property this episode was chosen for, and it would pass every
check in the repo — the page would render, the build would succeed, and the catalogue would
be Simplified again. So: **characters from the wikitext, timings from the ASR, never the
other way round.** `ATTRIBUTION.md` says this in the file a future editor will actually
have open.

Where the two disagree, the rule is evidence, not precedence:

- **約 omitted at 00:15** — the reader says 東北至新竹市區8公里, the article reads 約8公里.
  ASR confident and reproducible (avg_logprob −0.097). The cue carries what was spoken.
- **以及鯊魚類等為主 at 01:20** — a phrase the reader adds. Confirmed on two decodes. Kept.
- **北距 at 00:10** — the ASR hears 北至. Not settled: a short-window re-decode returned a
  subtitle watermark from training data, which voids that test rather than answering it.
  **The published 北距 stands and the disagreement is recorded.** 北距 is also excluded from
  the vocabulary list for exactly this reason — a term whose audio is disputed is not a term
  to teach.

`verifiedLesson: false`, and the third row above is the honest justification for it.

### 6. Level is Intermediate at 144 cpm, and the vocabulary is the reason

Measured 144 cpm — 197 Han characters over 82.06 s, digits not counted (ADR 0008's rule).
That is below the Beginner threshold of 170, and the episode is Intermediate anyway.

35 pauses totalling 28.11 s — **a third of the recording is silence** — so each clause lands
before the next begins. What makes it Intermediate is that harbour and inshore-fishing
vocabulary arrives one term per sentence with no repetition, and the passage ends in a list
of six fish. This is the second episode to show that speech rate alone does not carry the
level, which was ADR 0009's finding and is now a pattern rather than an anecdote.

The `levelReason` states only the vocabulary half. The rate is already in the sentence the
renderer builds in front of it (`reason.render.ts`), and saying it twice was a defect found
on screen, not by any check in the repo.

## What this does not do

- **It does not convert anything between Hant and Hans.** ADR 0006 stands. Episode 101 was
  deleted, not translated; episode 102 was sourced Traditional.
- **It does not make Spoken Wikipedia the ingestion strategy.** Still one episode, still
  hand-built. `sources.seed.json` is untouched. The corpus is mostly Simplified, which makes
  it a *worse* strategy for this product than ADR 0009 could see.
- **It does not revive FSI.** ADR 0007 decisions 1–3 stand.
- **It does not rename `cefr`.** ADR 0003 decision 7 keeps waiting; `"B1"` on episode 102 is
  the same owned judgement, on the same contested scale, as it was on 101.
- **It does not touch the `en → en` catalogue**, which is still the only pair with more than
  one episode's worth of anything.

## Consequences we accept

- **The replacement has the same shape as the thing it replaced.** One person reading an
  encyclopedia article. Everything ADR 0009 decision 1 confessed against ADR 0007 decision 1
  is still true, and swapping the script did not fix it — this is a floor, not a first pick.
  What the search bought was a *correct* floor rather than a wrong one, and the honest
  summary is that the Chinese catalogue is one item long and reads like a reference work.
  The fix is better content, not better wording.
- **A pair vanished from the site.** `en → zh-Hans` is gone; the build now emits 9 routes
  where it emitted 11. Anyone holding a `/en/zh-Hans/...` link gets a 404. Acceptable at
  one episode and one demo; it would not be after launch, and the redirect question is
  deferred rather than answered.
- **`Show.description` and `Episode.description` now differ in type.** Two fields, one name,
  two shapes, in the same file. Decision 2 says why; a reader who has not read it will
  reasonably find that surprising.
- **The 北距 disagreement ships unresolved**, in a lesson, in the vocabulary a learner is
  reading along with. Recorded in `ATTRIBUTION.md` and priced into `verifiedLesson: false`.
  The right resolution is a human listener, and there was not one.
