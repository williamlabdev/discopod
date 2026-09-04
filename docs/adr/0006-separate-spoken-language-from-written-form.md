# ADR 0006 — Separate the spoken language from the written form

- **Status:** Accepted
- **Date:** 2026-09-04
- **Corrects:** [ADR 0003](0003-model-the-learner-language-pair.md) decision 1, which
  typed `Show.language` as a `LanguageTag` and derived a pair's `learning` side from it
- **Closes:** the "`LanguageTag` conflates language with script" open question in
  [R24](../REQUIREMENTS.md#open-questions-this-requirement-surfaces), raised again by
  [ADR 0004](0004-measure-speech-rate-in-a-declared-unit.md)

## Context

`LanguageTag` is `'en' | 'zh-Hant' | 'zh-Hans'`, and it was used for two different
questions:

- **Which text do I show this reader?** `Localized`'s keys, the overlay filenames, the
  `/[speaks]/[learning]/` route segments. Here the tag is exactly right: `zh-Hant` and
  `zh-Hans` really are different text, and R24's rule — *do not return simplified
  characters to a learner reading traditional* — is only expressible because they are
  separate keys.
- **What language is this audio?** `Show.language`, and through it `rateUnitFor` and the
  `learning` side of every pair. Here the tag is wrong, because `zh-Hant` and `zh-Hans`
  are one spoken language. Nobody speaks in traditional characters.

The second use had already left two marks in the code.

**A table with a duplicated row.** `speech-rate.ts` opens by stating the invariant *"the
unit is a property of the audio's language, never of the learner's"*, and then keys its
table by a written form:

```ts
const RATE_UNIT: Record<LanguageTag, SpeechRateUnit> = {
  en: 'wpm',
  'zh-Hant': 'cpm',
  'zh-Hans': 'cpm',
};
```

Two rows, identical values, because a script cannot change how fast somebody talks. That
duplication was the type system reporting the conflation, in the only way it could.

**A show that has to pick a script in order to exist.** `CatalogService.listPairs` built
each pair as `{ speaks, learning: show.language }`. So the first Mandarin show would have
had to declare itself `zh-Hant` *or* `zh-Hans`, and that choice would then have decided
which learners could reach it. A traditional-reading learner and a simplified-reading
learner would have been offered the same audio or not offered it at all, on the basis of
a property of the audio that neither of them can hear. Serving both meant a second `Show`
row carrying the same audio, the same profile and a second id — a duplicate that every
future feature would have had to keep in step.

Nothing was broken today, because today's catalogue is one English lesson and `en` is
both a language and a written form. The cost was all in front of us: the first Mandarin
episode is exactly what makes this wrong, and it is also the episode this project exists
to serve.

## Decision

### 1. Three types where there was one

```ts
export const LANGUAGES        = ['en', 'zh-Hant', 'zh-Hans'] as const;  // written forms
export const SPOKEN_LANGUAGES = ['en', 'cmn'] as const;                 // sounds
export const SCRIPTS          = ['Latn', 'Hant', 'Hans'] as const;      // writing systems
```

`LanguageTag` keeps its name and its members. It is a genuine BCP-47 tag and it is the
right key for text, so `Localized`, the JSON overlay filenames and the route segments are
untouched — this ADR changes no URL and no stored data. What changes is that it is now
*only* used for text, and everything it was doing about audio moved to `SpokenLanguage`.

`cmn` is Mandarin (ISO 639-3), one language in two scripts.

### 2. The decomposition is a table, not a string operation

```ts
const WRITTEN_FORMS = {
  en:        { spoken: 'en',  script: 'Latn' },
  'zh-Hant': { spoken: 'cmn', script: 'Hant' },
  'zh-Hans': { spoken: 'cmn', script: 'Hans' },
} as const satisfies Record<LanguageTag, { spoken: SpokenLanguage; script: Script }>;
```

Splitting `zh-Hant` on the hyphen would be shorter and would be guessing. Traditional
script is also how Cantonese is written in Hong Kong; `zh-Hant → cmn` holds because *this
catalogue's* Chinese is Mandarin, which is a claim about our content and belongs
somewhere a person has to edit it. When Cantonese arrives it arrives as `yue-Hant`, and
because `LANGUAGES` is a closed union that arrival is a type error enumerating every site
that has to answer for it — instead of a Cantonese show silently counted as Mandarin and
ranked against Mandarin thresholds, which is the ADR 0004 failure in a new costume.

### 3. `Show.language` is what is spoken

```ts
language: SpokenLanguage;
```

One Mandarin show is one row. The field's own doc comment already said "the spoken
language"; it now has a type that means it.

`rateUnitFor` takes a `SpokenLanguage` too, and `RATE_UNIT` loses its duplicated row. The
invariant `speech-rate.ts` states in prose is now the one the compiler enforces: you
cannot ask this table about a script, because scripts are not what it knows about.

### 4. An episode declares the written form its transcript is in

```ts
transcriptLanguage: LanguageTag;
```

Scalar, because the transcript is scalar: one episode carries one transcript, in one
script. A Mandarin episode with a traditional transcript is in `en → zh-Hant` and is not
in `en → zh-Hans` — and that absence is honest, because the simplified transcript does
not exist.

`listPairs` now takes `learning` from here rather than from `show.language`:

```ts
const learning = episode.transcriptLanguage;
```

That one line is the whole point of the ADR. `show.language` is what the learner *hears*;
`pair.learning` is what the learner *reads*. They were the same field, and they are not
the same fact. One show's traditional and simplified episodes now raise both pairs with
no duplicated show, no duplicated audio and no second id.

### 5. Scripts are not converted into one another

Hant→Hans is many-to-one — 發 and 髮 are both 发 — so going back is a guess, and a guess
rendered as the learner's own reading is the fabrication this repo forbids everywhere
else. `writtenFormsOf(spoken)` lists the written forms of a language; it does not license
producing one from another. A transcript exists in the script it was authored in, and the
other script is a translation job.

This is ADR 0003's rule reaching a third kind of absence. A missing translation key
excludes the episode rather than falling back to English (ADR 0003); a missing
calibration excludes it rather than falling back to English thresholds (ADR 0004); a
missing script excludes it rather than being machine-converted into existence.

### 6. A transcript that disagrees with its show is loud, not silent

`listPairs` throws when `spokenLanguageOf(episode.transcriptLanguage)` is not the show's
`language`, naming the episode, the show and both languages.

This is deliberately not an exclusion, and the distinction is the one thing in this ADR
that is easy to get backwards. Exclusion is for content we *do not have*. A Mandarin show
carrying an English transcript is content that **disagrees with itself**, and the damage
it does is to raise a pair the audio cannot serve — a learner routed to a page whose text
and sound are different languages. Silence there would look exactly like an episode that
was never translated.

## What this ADR does not do

- **It does not add a script-keyed transcript.** `Episode.transcript` stays
  `TranscriptCue[]`. Keying it as `Partial<Record<LanguageTag, TranscriptCue[]>>` is the
  fully general shape and was considered and declined: it churns every transcript call
  site in both apps to model content that does not exist, and the scalar field plus one
  episode per script already removes the duplicate-`Show` problem that motivated the
  change. If one episode ever needs both scripts under one id, that is when the keyed
  version earns its cost.
- **It does not filter by `learning`.** `GET /episodes` takes `speaks` and not `learning`,
  so an episode is still excluded per reader but never per script. Harmless while every
  episode is `en`; the first Chinese episode is what makes it matter, and it is a
  controller and DTO change, not a model one.
- **It does not add Chinese audio, or calibrate `cpm`.** `RATE_UNIT` now says Mandarin is
  counted in `cpm` in one row instead of two, and `COMFORTABLE_RATE` still has no `cpm`
  row. A Mandarin episode remains excluded from every catalogue until someone stands
  behind three numbers — ADR 0004's block, untouched. Recent measurement work found that
  FSI's public-domain tapes cannot supply them: those recordings are 40–51% silence by
  construction, with the Mandarin arriving in 1–2 second drill fragments, so a `cpm`
  taken from them would measure a drill tape and not running speech.

  > **Refined by [ADR 0007](0007-fsi-is-a-pipeline-fixture-not-a-catalogue-source.md).**
  > The percentages above are right for FSI's drill tapes and wrong as a claim about the
  > course: module 09 is continuous connected speech, one tape running 27 minutes without a
  > detected pause. The conclusion survives on better grounds — teaching-speed 1970s
  > language-lab audio, and no aligned text — and FSI is now the ASR pipeline's fixture
  > rather than a catalogue candidate.
- **It does not touch `proficiency`.** ADR 0003 decision 7 (`cefr` → scale-qualified
  band) is the same shape of defect as this one — a value whose scale is implied — and it
  is still outstanding, now with ADR 0004, ADR 0005 and R24 waiting on it.
- **It does not add pinyin or zhuyin.** VISION.md promises "pinyin, zhuyin, or nothing"
  and nothing in the repo implements it. Reading aids are a *third* thing a script is not,
  and modelling them is separate work.

## Consequences we accept

- **`transcriptLanguage` is a new required field on the wire.** An API from before this
  commit serves episodes without it, and `assertEpisode` in `catalog-api.ts` now rejects
  those by name. That is the intended behaviour under ADR 0002's split deploy: the web app
  fails its build rather than rendering a page whose script it cannot vouch for.
- **`en` still hides the bug it was hiding.** English is one language with one script, so
  today's single-lesson catalogue exercises none of this. The verification is that lint,
  typecheck and build pass and both pairs still generate — not that the split is proven.
  It gets proven by the first Mandarin episode, which is exactly why it was worth doing
  before that episode rather than under it.
- **A show's audio and its episodes' scripts can drift apart in the data.** Two fields can
  disagree where one could not. Decision 6 is the price of that, and it is a throw during
  `next build` rather than a check somebody remembers to run.
- **`writtenFormsOf` currently has no caller.** It is the function that will be reached
  for when someone wants to offer a Mandarin show in both scripts, and its doc comment
  exists to say no to converting between them at that moment. Deleting it would delete
  the warning with it.
