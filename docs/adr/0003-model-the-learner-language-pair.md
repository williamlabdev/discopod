# ADR 0003 — Model the learner's language pair before ingestion writes a direction into the data

- **Status:** Accepted
- **Date:** 2026-09-04
- **Constrains:** [ADR 0002](0002-fetch-the-catalogue-at-build-time.md), whose static export
  is why the pair cannot be a request parameter

## Context

`docs/VISION.md` states the principle plainly: **"Both directions are first-class. A
language pair is symmetric or it isn't a pair."** (`VISION.md:113`), and describes
onboarding as "**I speak \_\_\_, I'm learning \_\_\_** — reversible, so the app serves a
Chinese speaker learning English as fully as the reverse, with the transcript, word list,
and review all flipping sides" (`VISION.md:86`).

Nothing in the code records either half of that sentence. `Show.language`
(`catalog.types.ts:30`) records the *show's* language and is hardcoded to `'en'`
(`catalog.seed.ts:107`). There is no field anywhere for the learner's language. So every
level, every reason, every gloss and every saved word is currently written for a learner
whose language is unstated — and, in practice, assumed to be English.

Two observations made this urgent rather than tidy.

**The vision document is itself asymmetric, in the opposite direction from the code.**
Its prose assumes an English speaker learning Chinese: the reading aids are "pinyin,
zhuyin, or nothing" (`:40`), a second pass leaves "nothing but sound and characters"
(`:43`), and success is "The **English** side switches off" (`:104`) — English as the
*support* language. Only `:52` is written symmetrically ("characters or words per
second"). The shipped app runs the other way and records neither. When the document that
states the symmetry principle cannot itself hold a direction steady, an unstated default
is not going to survive contact with a second pair.

**The bill grows with ingestion, and only for some fields.** Text in this catalogue is in
one of two languages, and the split is not where it looks. Counting what is authored in
`catalog/data/catalog.seed.json` today:

| Authored | Count | Language | On the bill? |
| --- | --- | --- | --- |
| `vocabulary[].meaning` | 28 | learner's | **yes** |
| `levelReason` → `profile.reason` | 7 | learner's | **yes** |
| `learningGoal` | 7 | learner's | **yes** |
| `questions[].prompt` + `options` | 15 | learner's today | **yes**, see below |
| `transcript[].translation` | 0 of 33 cues | learner's | **yes** — the whole of Pillar 1 |
| `cefr` | 7 | neither — a scale | **yes**, differently |
| `title`, `description`, `vocabulary[].term`, `vocabulary[].example` | 7 / 7 / 28 / 28 | the show's | no |
| `RankedEpisode.reason` | computed, `catalog.service.ts:114` | learner's | no — recomputed each build |

That is 57 authored strings plus 33 untranslated cues at seven hand-authored episodes.
`ingest/data/sources.seed.json` holds eleven shows with 97–187 items each. Ingestion at
that scale turns 57 into five figures and 33 into six, in a shape that has nowhere to put
a second language. Fixing the shape afterwards means rewriting every row.

`RankedEpisode.reason` is the instructive exception. It is composed at request time and
never stored, so it costs the same to fix today or in a year — but it is *already*
untranslatable: `explain()` concatenates an English sentence with English pluralisation
(`${minutes} minute${minutes === 1 ? '' : 's'}`, `catalog.service.ts:118`) and English
word order. Chinese has no plural inflection there. It is on the list, not on the bill.

**ADR 0002 removes the easy answer.** Level is a request parameter — `GET
/episodes?level=Beginner` — because the same episode is a different fit for a different
learner. The pair is the same kind of fact, so a query parameter is the obvious shape.
But ADR 0002 bakes the catalogue into a static export at build time; `discopod-web` is
files on a CDN and `discopod-api` sleeps. A runtime parameter would mean either
revisiting ADR 0002 or shipping every pair's content to every visitor.

## Decision

### 1. A language pair is a first-class key, not a user setting

```ts
export const LANGUAGES = ['en', 'zh-Hant', 'zh-Hans'] as const;
export type LanguageTag = (typeof LANGUAGES)[number];

export interface LanguagePair {
  /** The learner's own language. Every explanation is written in this. */
  speaks: LanguageTag;
  /** The language of the audio. Transcript, terms and examples are in this. */
  learning: LanguageTag;
}
```

A closed union rather than a bare `string`. Pairs are added by us, deliberately, with
content behind them; an open type would let a typo become an empty catalogue at runtime.
`zh-Hant` and `zh-Hans` are separate tags because the script changes the transcript text
itself, not merely the gloss — a Taiwanese learner and a mainland learner are not served
by one row.

`Show.language` stays as it is. It states a fact about the show; `pair.learning` states a
request. A show whose `language` is not the pair's `learning` is simply not in that
pair's catalogue.

### 2. Learner-language text is keyed by language; show-language text stays scalar

```ts
/** Authored per native language. A missing key means untranslated, never English. */
export type Localized<T = string> = Partial<Record<LanguageTag, T>>;
```

The asymmetry is the point, and it is what keeps this cheap. One English episode serves
every native language: the audio, the transcript text, the terms and the example
sentences are shared across all of them. Only the explanatory layer differs. So an
episode is **not** duplicated per pair — only its `Localized` fields gain a key.

Applied to `catalog.types.ts`:

- `TranscriptCue.translation` (`:43`) → `Localized`
- `VocabularyEntry.meaning` (`:51`) → `Localized`
- `DifficultyProfile.reason` (`:22`) → `Localized`
- `Episode.learningGoal` (`:70`) → `Localized`
- `ComprehensionQuestion.prompt` / `options` (`:56–57`) → `Localized` **for now**, with a
  note: when the quiz becomes listening practice as `VISION.md:66` requires, the options
  are words the learner *heard* and belong in the show's language. That is an exercise
  redesign, not a language decision, and this ADR does not pre-empt it.
- `TranscriptCue.text`, `VocabularyEntry.term`, `VocabularyEntry.example`, `title`,
  `description` — unchanged, scalar, in the show's language.

### 3. A missing translation is an exclusion, not a fallback

`Localized` is `Partial` so absence is representable. The rule: **an episode missing the
pair's `speaks` key is not in that pair's catalogue.** It is not shown with English
glosses to a Chinese learner.

This is the existing honesty invariant applied to language. The repo already refuses to
fabricate a ranking signal (`CLAUDE.md`, and the completion-signal row in `VISION.md:73`)
and already fails the build on a ranked episode with no reason (`assertRanked`,
`catalog-api.ts:149`). Showing a learner their "native-language side" in a language they
did not ask for is the same class of lie, and `assertEpisode` is where it gets caught.

The consequence is deliberate: a newly declared pair starts with **zero episodes** until
its layer is authored. That is the honest state, and it is visible instead of silent.

### 4. The pair is a route segment

```
/[speaks]/[learning]/                 → /zh-Hant/en/          (discover)
/[speaks]/[learning]/episode/[id]     → /zh-Hant/en/episode/1
```

`generateStaticParams` (`apps/web/app/episode/[id]/page.tsx:15`) produces the cross
product of supported pairs and that pair's episodes. This is the only shape that keeps
ADR 0002 intact: the catalogue stays baked at build time, each page carries exactly one
pair's content, and no visitor downloads a language they are not learning.

The URL reads as the onboarding sentence from `VISION.md:86` — *I speak `zh-Hant`, I'm
learning `en`* — which makes a shared link carry its own direction. The five internal
links (`discover.tsx:241,305`; `episode-learning.tsx:135,139,295`) become pair-relative.

Rejected: a query parameter (needs a runtime API, revisits ADR 0002 for no gain); one
segment `/zh-Hant-en/` (ambiguous against tags that already contain a hyphen); shipping
all pairs and switching client-side (payload grows with every pair, for every visitor).

### 5. Saved words carry their pair

`SaveWordDto` (`apps/api/src/vocabulary/save-word.dto.ts:3`) gains `speaks` and
`learning`; `SavedWord` in `apps/web/lib/saved-words.ts:21` gains the same. `meaning` is
in the learner's language, and a learner may hold more than one pair over their life with
the app; a bare gloss with no language on it cannot be reviewed correctly afterwards.

This is the one field that is genuinely user-owned and cannot be regenerated, and it is
free to change **today** — the records live on the device and `VocabularyService` is
in-memory, so there is nothing deployed to migrate. That will not be true again.

### 6. Today's catalogue is declared `en → en`

Not backfilled with a guess, not left implicit. The seven episodes have English audio and
English explanations, so the honest declaration is `{ speaks: 'en', learning: 'en' }`.

This is worth stating because it explains Pillar 1's gap in one line: the bilingual
transcript is not missing because translation was skipped, it is missing because **there
is no second language in the content to put on the other side.** The first real pair —
`{ speaks: 'zh-Hant', learning: 'en' }` — is content work against a settled model, not a
schema change.

### 7. `cefr` becomes a scale-qualified band

```ts
proficiency: { scale: 'CEFR' | 'HSK' | 'TOCFL'; band: string }
```

`DifficultyProfile.cefr` (`:20`) is a bare string today. CEFR is a European framework; a
learner of Chinese is placed by HSK or TOCFL. The scale belongs to the **learning**
language, not to the pair, and hardcoding one of them is the same unstated default this
ADR exists to remove.

## What this ADR does not do

- No onboarding UI. `VISION.md:86` describes three screens; this decides the model they
  would write into, nothing more.
- No translation of any content, and no Chinese shows. All eleven feeds in
  `sources.seed.json` are English, so ingestion built on it serves one direction whatever
  this ADR says. The model must land first so that it does not serve it *silently*.
- No reason renderer. `explain()` stays an English sentence until the second pair needs
  it; it is on the list, not on the bill.
- No route restructuring in this change. The shape is decided here so ingestion and
  onboarding do not each invent one.

## Consequences we accept

- **Build time and output size grow linearly with supported pairs.** Acceptable because
  pairs are added by us with content behind them, not chosen freely by users, and each
  pair re-renders only its own explanatory layer over shared audio and transcripts.
- **A declared pair with no authored layer serves an empty catalogue.** That is the
  intended failure mode. It is loud, and it is preferable to serving English glosses
  under a Chinese flag.
- **`Localized` is `Partial`, so every read site must handle absence.** This is the cost
  of not having a silent fallback, and it is the cost we are choosing to pay. The
  build-time assertions in `catalog-api.ts` are where absence turns into a failed build
  rather than a blank region on a page.
- **Every existing URL changes.** Nothing is deployed at a stable public URL yet, so the
  break is free now and will not be later — which is the general argument of this ADR,
  applied to routing.
- **The `en → en` declaration looks degenerate, because it is.** It describes a catalogue
  that does not yet do the thing the product is for. Naming it is how it stops being
  invisible.
