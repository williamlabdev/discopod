# Requirements

Numbered requirements for DiscoPod. The numbering comes from a requirements document
maintained outside this repo, so it starts where it starts — **R24 is the first entry
landed here, and R1–R23 are deliberately absent rather than missing.** When an earlier
requirement lands, it keeps its original number and slots in above.

Requirements describe what should be true of the product. Decisions about *how* the
system is shaped to make them true go in [`docs/adr/`](adr/), and a requirement that
cannot be built without changing that shape says so in its own "Blocked on" section.

---

## R24 — "In other words": elaborated restatement in the target language

- **Priority:** P1 — the highest-value item in P1 and cheaper than anything else in it.
- **Status:** Specified, not started.
- **Blocked on:** [ADR 0002](adr/0002-fetch-the-catalogue-at-build-time.md). See
  "Blocked on" below; this is not a small caveat.

### What it is

When a learner hits a sentence they can't follow, they currently have one escape: switch
on the native-language side. That is a large step, and it takes them out of the target
language entirely.

"In other words" adds a middle rung. The learner taps a cue, and gets the same sentence
said differently — **still in the target language** — with the difficult expression kept
and explained in context rather than removed.

Three rungs, in order:

1. **Original.** Always visible, never replaced.
2. **In other words.** Elaborated restatement, target language, one tap.
3. **Native language.** Full translation, second tap.

### Why elaborate rather than simplify

This is the design decision the feature turns on, and getting it backwards makes the
feature actively harmful.

A **simplifier** removes complex structure and rare vocabulary. Applied to the sentence a
learner didn't understand, it deletes precisely the thing they needed to learn. The
learner resolves their confusion and acquires nothing.

An **elaborator** keeps the difficult expression and adds redundancy around it —
restatement, an appositive clause, a concrete example. The learner meets the hard
expression twice in one breath, once cold and once explained.

```
Original
  "And misfolding is where it gets dangerous. A misfolded protein can clump
   together with others, and those aggregates are what we see in Alzheimer's."

Simplified  — WRONG. 'aggregates' is gone; nothing was learned.
  "When it folds wrong it can stick to others. Those clumps show up in Alzheimer's."

Elaborated  — CORRECT. 'aggregates' survives and is explained in place.
  "And misfolding is where it gets dangerous. A misfolded protein can clump
   together with others — and those clumps, those aggregates, are what we see
   in Alzheimer's."
```

This is what a good host does live: jargon defined as it is introduced, mid-sentence,
without stopping. The feature gives every show that property on demand.

### Why it earns its place

- **It is the only support in the app that keeps the learner inside the target
  language.** Everything else routes through their own language.
- **It sharpens level estimation.** "Opened translation" collapses several different
  failures into one event. Rung-of-resolution does not: a learner who resolves at rung 2
  is at the edge of their range; one who needs rung 3 is past it. That is a far better
  signal than a binary, and it costs nothing extra to collect.
- **It matches a stated principle.** [VISION.md](VISION.md) says reading support exists
  to be outgrown. This is the rung they outgrow the native-language side onto.

### Acceptance criteria

**Behaviour**

1. Tapping a cue produces an elaborated restatement in the target language, rendered
   directly **below** the original. The original is never replaced or hidden.
2. The restatement is visibly labelled as generated — not presented as something the
   speaker said.
3. A second tap reveals the native-language translation. Rung 3 is always reachable; the
   feature never traps a learner who still doesn't understand.
4. The learner can collapse back to rung 1 in one tap.
5. Saving a word from an elaborated restatement stores the **original** sentence as its
   context, with the original timestamp and speaker. Review must prompt with real audio,
   never with generated text.

**Output validity — enforced in code, not by prompt alone**

6. The identified difficult expression appears verbatim in the output. If it does not,
   the generation is rejected.
7. Output length is between 1.0× and 1.8× the original. Shorter means it simplified;
   much longer means it started explaining rather than restating.
8. Output contains no native-language characters when the target language is English, and
   no Latin prose when the target is Chinese (loanwords and proper nouns excepted).
9. On validation failure, retry once. On second failure, hide rung 2 for that cue and
   offer rung 3 directly — degrade to the existing behaviour rather than showing bad
   output.

**Caching**

10. Keyed by episode id + cue index + level. Not per learner — two learners at the same
    level on the same cue get the same text and the second is free.
11. Cached restatements survive a restart, in the same store as the transcript.

**Telemetry into level estimation**

12. Each cue interaction emits `rungReached: 1 | 2 | 3`.
13. Rung-2 resolution is evidence the learner is **at** their edge (a good sign — this is
    the target zone); rung-3 resolution is evidence they are **past** it. Rung-2 events
    must not push the level estimate down the way rung-3 events do.

### Prompt specification

**System**

```
You rewrite one sentence from a podcast transcript for a language learner who did
not understand it. You are not a translator and not a summariser.

Rules:
- Write in {target_language} only. Never use the learner's native language.
- Keep the difficult expression exactly as it appeared. Do not replace it with an
  easier word. Explain it in place, using an appositive, a short restatement, or a
  concrete example.
- Add nothing that was not in the original. No new facts, names, numbers, dates or
  claims. If the original is vague, stay vague.
- Keep the speaker's register. A casual sentence stays casual.
- Stay close to the original length. One added clause, not a paragraph.
- If you cannot do this without inventing information, return an empty restatement.

Return JSON only:
{"restatement": string, "hardExpression": string}
```

**User**

```
Learner level: {level}
Difficult expression the learner tapped: {tapped_span | "not specified"}

Preceding line: {cue[i-1]}
LINE TO REWRITE: {cue[i]}
Following line: {cue[i+1]}
```

Neighbouring cues are context for pronoun and referent resolution only. The model
rewrites the middle line and nothing else.

**Notes on the prompt**

- `hardExpression` is returned so criterion 6 can be checked automatically. If
  `tapped_span` was supplied, the model must return that span.
- The empty-restatement escape hatch matters. A model given no way to decline will
  invent. Give it one and validate for it.

### The risk this feature carries

A bad translation is visibly bad — the learner can check it against the original. **A bad
restatement is invisible.** It reads fluently, it looks authoritative, and the learner
has no way to catch it, because not understanding the original is the reason they asked.
Any hallucinated detail enters their understanding as fact.

Criteria 2, 6 and 9 exist for this reason and are not optional polish. Showing the
original above the restatement is the single most important mitigation: it gives the
learner something to check against, and it makes the relationship between the two lines
the point of the interaction rather than an implementation detail.

### Chinese target language

Elaboration works differently for Chinese and the same prompt will not transfer:

- The unit is not a "word." A difficult item may be a 成語, a four-character phrase, or a
  compound that segmentation splits wrongly. Needs a segmentation decision this repo has
  not made.
- Useful elaboration for Chinese often means giving the 白話 equivalent alongside the
  formal or literary phrasing, which is closer to register-shifting than to clause-adding.
- Script variant must be respected. Do not return simplified characters to a learner
  reading traditional. This repo's `LanguageTag` (`zh-Hant` / `zh-Hans`) carries the
  script but conflates it with the language — see "Open questions" below.

Ship English first. Treat Chinese as a separate prompt and a separate validation path,
not a parameter.

### Blocked on

**ADR 0002 — the catalogue is fetched at build time and the site is a static export.**
The browser does not call the API; there is no runtime server. Criterion 1 ("tapping a
cue produces a restatement") and criteria 10–13 (a shared cache, telemetry) all assume
one. This is not an implementation detail to be worked around later — it decides the
whole shape of the feature, and there are two honest routes:

- **Revisit ADR 0002** and give the app a runtime API for generation, caching and
  telemetry. This is the route the requirement as written assumes.
- **Generate at build time**, all cues × all levels, into the catalogue. The site stays
  static and costs nothing per learner. This contradicts the requirement's "no proactive
  rewriting" exclusion — but note that exclusion's *stated* reason ("what makes the
  rung-of-resolution signal meaningful") does not survive scrutiny: the signal comes from
  which rung the learner **opened**, not from when the text was produced. The real cost of
  proactive generation is money and build time, which is a different argument and a
  weaker one at this catalogue size.

Either way it is an ADR, not a patch.

### Open questions this requirement surfaces

These are not objections to the requirement; they are things it makes urgent.

- **No level estimator exists.** Criteria 12–13 describe how a component should weigh
  rung-2 against rung-3 events. Nothing in the codebase estimates a learner's level today
  — `DifficultyProfile.level` is a property of the *episode*, chosen by the learner from
  three buttons. Criteria 12–13 are a spec for a component that has to be built first.
- **No telemetry path exists.** Saved words live in `localStorage`
  (`apps/web/lib/saved-words.ts`); nothing is sent anywhere. Emitting per-cue learner
  events is a new capability with its own privacy decision.
- **`cefr` is a bare string.** The prompt takes a level band; [ADR 0003](adr/0003-model-the-learner-language-pair.md)
  decision 7 (`cefr` → scale-qualified `proficiency`) is outstanding, and CEFR is the
  wrong scale for a Chinese learner. This requirement is another caller that needs it.
- **`LanguageTag` conflates language with script.** `zh-Hant` and `zh-Hans` are the same
  audio with different transcripts. The script-variant rule above needs that distinction
  modelled, not implied.
- **Criterion 5 is already supported.** `SavedWord` carries sentence, speaker and
  timestamp. Storing the original rather than the restatement is a call site discipline,
  not a schema change.

### Out of scope

- Rewriting whole episodes or whole segments. One cue at a time, on demand.
- Grammar explanation. This feature restates; it does not teach syntax.
- Proactive rewriting — **conditionally.** See "Blocked on": if the build-time route is
  taken, this exclusion is the thing being traded away, and that trade needs stating
  rather than inheriting.
