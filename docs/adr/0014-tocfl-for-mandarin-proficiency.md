# ADR 0014 — TOCFL is the proficiency framework for Mandarin

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Closes:** [ADR 0003](0003-model-the-learner-language-pair.md) decision 7 for
  Mandarin. That decision named `cefr` misnamed the moment a Mandarin episode
  appeared and left the framework choice for the caller with the defect. Two Mandarin
  episodes shipped under `cefr: "B1"` before this ADR.
- **Builds on:** [ADR 0010](0010-the-chinese-discopod-teaches-is-traditional.md),
  which declared the Chinese DiscoPod teaches is Traditional and Taiwan-normed. The
  framework choice here is downstream of that.

## Context

Episodes 101 and 102 shipped with `cefr: "B1"` — a European label on Mandarin
recordings, chosen because the field was called `cefr` and B1 was the least-wrong
string to put in it. Wrong twice: CEFR is not calibrated against Chinese characters,
and B1 is a label no language teacher of Mandarin uses about Mandarin content — a
learner told they read at B1 in Chinese cannot compare it to any class, textbook, or
exam they have taken.

The catalogue is now growing by 24 podcast episodes ([ADR
0015](0015-full-episode-ingestion-and-remote-audio.md)), every one of which needs a
proficiency band. Continuing under `cefr` would multiply the defect by 24 and make the
migration harder for the reason ADR 0003 decision 7 kept deferring it: more callers,
more prose to rewrite, same wrong scale underneath.

## Decision

### 1. Mandarin episodes carry a TOCFL band

`Episode.tocfl?: TocflBand` is added, where `TocflBand` is the closed union `'Novice 1' |
'Novice 2' | 'Level 1' | ... | 'Level 5' | 'Advanced High'`. The seed row for a Mandarin
episode writes `tocfl`; it does not write `cefr`. The seed loader carries the value
through unchanged and the API surfaces it beside `level`.

`cefr` remains optional on the type. It is not deleted because the `zh-Hant → en`
pair's episodes — VOA *Let's Learn English* — are legitimately CEFR-shaped English
content and CEFR is the framework their publisher targets. `cefr` now means what its
name says: a CEFR band on episodes where CEFR applies. Two frameworks live side by
side, each declared by the episodes that use it.

### 2. TOCFL, not HSK

HSK is a Mainland exam that tests Simplified characters and Mainland vocabulary —
视频, 软件, 出租车. The catalogue is Traditional (ADR 0010) and its Mandarin shows are
Taiwan speakers using 影片, 軟體, 計程車. Labelling an episode HSK 5 is a claim
checkable against an HSK 5 wordlist, and the check fails on vocabulary the show uses
fluently. HSK matches a different catalogue.

TOCFL is Taiwan's exam. Its character and vocabulary lists are Traditional and its
bands include the terms this catalogue's shows actually use. A learner who has passed
TOCFL Level 3 and is offered a Level 3 episode can compare the label to something
they sat.

### 3. TOCFL is not wired into ranking

`CatalogService.rankEpisodes` still ranks on `LearningLevel`, `cpm`, and pause
structure. `tocfl` is displayed but does not feed the score. Wiring it through the
ranker has its own calibration question — a Novice 2 episode at 200 cpm is not
obviously easier than a Level 1 at 140 — that this ADR does not answer.

## Consequences

**An HSK-familiar learner sees a scale they cannot map.** A "≈ HSK 4" footnote is
deferred; adding it would embed the HSK-to-TOCFL correspondence, which is contested
and would land the same misnamed-field problem one level down. Teach the honest label
first; do not fabricate a bridge to the wrong one.

**The seed grows a second proficiency field.** `cefr` and `tocfl` both live on
`Episode`, each optional, and the rule is which one *the episode* declares. A future
third scale would add a third optional field. That is more surface area than a single
`proficiency: { scale, band }` bag, and deliberately less compressible: a switch over
`TocflBand` is what the compiler audits; a `{ scale: string; band: string }` is what it
does not.

**Two episodes are relabelled without republishing audio.** 101 was deleted with ADR
0010; 102 (海山漁港) has its `cefr: "B1"` replaced with `tocfl: "Level 2"` in the same
commit that adds the field. The `levelReason` names vocabulary and pauses, not the
scale, so the swap does not invalidate the sentence a learner reads.

**HSK is not ruled out for later.** A Simplified-script catalogue would need HSK. If
it arrives, HSK is a third field, not a replacement.
