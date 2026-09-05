# Ingest Mandarin Podcasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest ~24 real Mandarin podcast episodes from `/Users/lemo/code/repo/playground/podcastdiscovery/transcripts/` into two learner directions of the catalogue (`en → zh-Hant` and `vi → zh-Hant`), including the ingest script, the type/seed/overlay wiring, and the small UI adjustments that make the new episodes render honestly.

**Architecture:** A one-shot Node script under `apps/api/src/ingest/` reads the folder, joins each episode's `metadata.json` / `transcript.json` / `bilingual.en.srt` / `bilingual.vi.srt` with a hand-authored per-episode ratings file, and emits one seed file plus one Vietnamese overlay file. The seed file is added to `SEED_FILES`; `catalog.vi.json` becomes a new `OVERLAY_LANGUAGES` entry. `vi` becomes a valid `LanguageTag`. UI adjustments hide the vocabulary tab / `newWords` line on episodes with no authored vocabulary, and label auto-translated overlay text as such.

**Tech Stack:** TypeScript, Node 22.13.0, NestJS 11, Next.js 16 (React 19 RSC), Jest, `tsx` for one-shot script execution. No new runtime dependencies.

**Spec:** [`docs/superpowers/specs/2026-09-05-ingest-mandarin-podcasts-design.md`](../specs/2026-09-05-ingest-mandarin-podcasts-design.md).

---

## Task 1: Write the five ADRs

**Files:**
- Create: `docs/adr/0014-tocfl-for-mandarin-proficiency.md`
- Create: `docs/adr/0015-full-episode-ingestion-and-remote-audio.md`
- Create: `docs/adr/0016-authored-vocabulary-is-a-lesson-artifact.md`
- Create: `docs/adr/0017-english-overlay-from-machine-translation.md`
- Create: `docs/adr/0018-vietnamese-as-a-learner-language.md`

- [ ] **Step 1: Draft ADR 0014 (TOCFL)**

Create `docs/adr/0014-tocfl-for-mandarin-proficiency.md`. Follow the voice of neighbouring ADRs (0010, 0013 are the recent template). Content in ~600 words:

- **Status:** Accepted, 2026-09-05.
- **Context:** ADR 0003 decision 7 left the proficiency framework open for Mandarin. Episodes 101/102 shipped with `cefr: "B1"` under a `LearningLevel` of Intermediate, which was wrong twice: CEFR is a European framework not calibrated against Chinese characters, and B1 is a label about listening a language teacher does not use for Mandarin content.
- **Decision:** Mandarin episodes use **TOCFL** (Novice 1 → Advanced High). The seed carries `tocfl: TocflBand` on those episodes. `cefr` remains an optional field but is not written for Mandarin.
- **Why TOCFL, not HSK.** HSK tests Simplified characters and Mainland vocabulary (视频, 软件); the catalogue is Traditional (ADR 0010) and the shows are Taiwan speakers. HSK 5 would be a false claim about a transcript using 影片 instead of 视频. TOCFL matches the content.
- **What this does not do:** wire TOCFL into ranking. `CatalogService` still ranks on `LearningLevel` + `cpm` + pauses. Wiring TOCFL is a separate change.
- **Consequences:** English-speaking learners familiar only with HSK see a label they cannot compare to Duolingo. A card footnote ("≈ HSK 4") is deferred.

- [ ] **Step 2: Draft ADR 0015 (full-episode ingestion, remote audio)**

Create `docs/adr/0015-full-episode-ingestion-and-remote-audio.md`. ~700 words.

- **Status:** Accepted, 2026-09-05.
- **Context:** The catalogue's five shipped episodes (7, 102, 103, 104, VOA lessons) are 60–200 seconds each, with audio committed byte-for-byte or excerpted under CC BY-SA. The next 24 episodes are real podcast episodes at 20–45 minutes each. Both properties change together: committing audio at that length is 600+ MB, and excerpting a 30-minute conversation for language learning is a curatorial task the app is not aiming to do at ingest time.
- **Decision:** Ingested podcast episodes ship **full-length** and point at the publisher's **remote** `audio_url` (from RSS). Nothing is downloaded.
- **Consequences named as deferred work, not bugs.**
  - The player was built for ~90-second cue lists. A 40-minute episode with 400+ cues will render but scroll poorly. Virtualisation and scroll-lock-to-current-cue are a separate design.
  - Resume-from-position becomes essential — no one starts a 40-minute podcast from zero every open. Needs a per-learner store; deferred.
  - Remote URLs can rotate. Libsyn `dest-id=…` tokens look stable but if one 404s post-ingest, that is a re-fetch, not a design bug.
- **Alternatives rejected:** downloading and self-hosting (unaffordable at scale), excerpting to 90-second clips (loses what makes a real podcast episode).

- [ ] **Step 3: Draft ADR 0016 (authored vocabulary is a lesson artifact)**

Create `docs/adr/0016-authored-vocabulary-is-a-lesson-artifact.md`. ~600 words.

- **Context:** `Episode.vocabulary[]` was authored by hand for the five lesson-shaped episodes: term + meaning + example sentence + `sourcePrompt` anchor into the transcript. It drives the *Vocabulary* tab, the discovery card's `newWords` count, and `DifficultyProfile.vocabularyCoverage` — one input to ranking.
- **Problem:** For a 30-minute conversation, "the five words this episode teaches" is fabricated. A real episode teaches whatever the learner does not already know, which is exactly what saved-words captures (ADR 0011).
- **Decision:** Ingested podcast episodes ship `vocabulary: []`. The Vocabulary tab hides on episodes with an empty list. The discovery card hides its `newWords` line under the same condition. `vocabularyCoverage` is not used as a ranking signal for these episodes.
- **What replaces it:** eventually, tap-a-word lookup against CC-CEDICT with save-to-learner-vocab. Not in this slice; its own design.
- **Consequences:** two visible affordances (`Vocabulary` tab, `newWords` line) become conditional. Existing lesson episodes are unchanged.

- [ ] **Step 4: Draft ADR 0017 (English overlay from machine translation)**

Create `docs/adr/0017-english-overlay-from-machine-translation.md`. ~500 words.

- **Context:** Existing `en → zh-Hant` episode 102 ships without English cue translations — the learner reads Chinese cues directly, no crutch. Ingested podcast episodes are 20–45 minutes long; a learner who cannot yet follow a 40-minute conversation in Chinese benefits from a translation crutch.
- **Decision:** Ingested episodes carry English cue translations, sourced from `bilingual.en.srt` (ElevenLabs Scribe v2's auto-translation) and stored on the seed cue as an optional `translation` string. The English text is authored in the seed's `speaks` language (English) and is lifted into `TranscriptCue.translation` as `{ en: text }` by the loader.
- **Honesty:** every ingested episode carries `overlayVerified: false`. The UI labels the translation as "auto-translated" or equivalent. The label is a required affordance, not a decorative one.
- **Alternatives rejected:** hide the translation entirely (worse for the learner than an imperfect crutch with a clear label); manually translate 400+ cues per episode (curatorial work not owned by this slice).

- [ ] **Step 5: Draft ADR 0018 (Vietnamese as a learner language)**

Create `docs/adr/0018-vietnamese-as-a-learner-language.md`. ~500 words.

- **Context:** Every episode in the source folder has both `bilingual.en.srt` and `bilingual.vi.srt`. The repo's language machinery (`Localized`, `LanguageTag`, overlay pattern) is designed for exactly this shape.
- **Decision:** Add `'vi'` to `LANGUAGES`. Ship the `vi → zh-Hant` pair driven by a new `catalog.vi.json` overlay. Vietnamese `levelReason` / `learningGoal` / `description` are machine-translated from the English author copy at ingest time and marked `authoredBy: "auto-translated"` alongside `overlayVerified: false`.
- **Not done:** localise the UI chrome. A Vietnamese learner sees Chinese cues + Vietnamese overlay + English chrome, the same limitation the existing `zh-Hant → en` pair has. Chrome i18n is a separate design.
- **Consequences:** `[speaks]` route accepts `/vi/…`. Exhaustive switches on `LanguageTag` grow one arm each.

- [ ] **Step 6: Commit**

```bash
git add docs/adr/0014-tocfl-for-mandarin-proficiency.md \
        docs/adr/0015-full-episode-ingestion-and-remote-audio.md \
        docs/adr/0016-authored-vocabulary-is-a-lesson-artifact.md \
        docs/adr/0017-english-overlay-from-machine-translation.md \
        docs/adr/0018-vietnamese-as-a-learner-language.md
git commit -m "$(cat <<'EOF'
Add ADRs 0014-0018 for the podcast ingest.

TOCFL for Mandarin proficiency, full-episode + remote audio, authored
vocabulary as a lesson artifact, English overlay from ASR translation,
Vietnamese as a learner language.
EOF
)"
```

---

## Task 2: Add `vi` to `LANGUAGES` and follow the type errors

**Files:**
- Modify: `apps/api/src/catalog/language.types.ts:25`
- Modify (any file with an exhaustive switch on `LanguageTag`; TypeScript will name them)

- [ ] **Step 1: Edit `LANGUAGES`**

In `apps/api/src/catalog/language.types.ts:25`, change:

```ts
export const LANGUAGES = ['en', 'zh-Hant', 'zh-Hans'] as const;
```

to:

```ts
export const LANGUAGES = ['en', 'zh-Hant', 'zh-Hans', 'vi'] as const;
```

- [ ] **Step 2: Extend `WRITTEN_FORMS`**

At `apps/api/src/catalog/language.types.ts:61-65`, add the `vi` entry:

```ts
const WRITTEN_FORMS = {
  en: { spoken: 'en', script: 'Latn' },
  'zh-Hant': { spoken: 'cmn', script: 'Hant' },
  'zh-Hans': { spoken: 'cmn', script: 'Hans' },
  vi: { spoken: 'vi', script: 'Latn' },
} as const satisfies Record<LanguageTag, { spoken: SpokenLanguage; script: Script }>;
```

- [ ] **Step 3: Extend `SPOKEN_LANGUAGES`**

At `apps/api/src/catalog/language.types.ts:40`:

```ts
export const SPOKEN_LANGUAGES = ['en', 'cmn', 'vi'] as const;
```

Vietnamese is added even though we ship no Vietnamese *audio* — the type has to satisfy `Record<LanguageTag, { spoken: SpokenLanguage; …}>`, and `WRITTEN_FORMS.vi.spoken` needs to be a valid `SpokenLanguage`. The `speech-rate.ts` file has a `rateUnitFor(spoken)` — if it does not know about `vi`, add a `vi: 'wpm'` entry (Vietnamese uses spaces, word-per-minute is the right unit).

- [ ] **Step 4: Run typecheck; fix each error**

```bash
npm run typecheck
```

Expected: TypeScript names ~5–10 exhaustiveness holes. Fix each mechanically — usually a switch that needs a `case 'vi':` arm, or a `Record<LanguageTag, …>` literal that needs one more key. The point of the closed union is that the compiler audits.

Common places:

- `apps/api/src/catalog/speech-rate.ts` — `rateUnitFor` map. Add `vi: 'wpm'`.
- `apps/api/src/catalog/catalog.overlay.ts` — no change needed yet (that's Task 11).
- Any web-side switch on `LanguageTag`.

Re-run `npm run typecheck` until clean.

- [ ] **Step 5: Commit**

```bash
git add -u apps/api/src/catalog/language.types.ts apps/api/src/catalog/speech-rate.ts
# and any other files that changed
git commit -m "Add 'vi' as a LanguageTag for Vietnamese learners"
```

---

## Task 3: Extend Episode + SeedRow types with the new optional fields

**Files:**
- Modify: `apps/api/src/catalog/catalog.types.ts` (Episode)
- Modify: `apps/api/src/catalog/catalog.seed.ts` (SeedRow interface + loader mapping)

- [ ] **Step 1: Add `TocflBand`**

At the top of `catalog.types.ts` (after `LearningLevel`):

```ts
/**
 * TOCFL proficiency levels for Mandarin, per ADR 0014. Novice 1 is the easiest.
 * See docs/adr/0014-tocfl-for-mandarin-proficiency.md.
 */
export type TocflBand =
  | 'Novice 1'
  | 'Novice 2'
  | 'Level 1'
  | 'Level 2'
  | 'Level 3'
  | 'Level 4'
  | 'Level 5'
  | 'Advanced High';
```

- [ ] **Step 2: Add optional fields to `Episode`**

Inside the `Episode` interface in `catalog.types.ts`, add these fields (position them near related existing ones):

```ts
  /**
   * TOCFL proficiency band, when Mandarin. Absent for non-Mandarin episodes and
   * for episodes still labelled with `cefr`. See ADR 0014.
   */
  tocfl?: TocflBand;
  /**
   * How the transcript's characters ended up Traditional. Absent means the
   * source was native Traditional. `"manual"` means an owner converted them
   * outside the ingest; see ADR 0010 and the podcast ingest design.
   */
  scriptConversion?: 'manual';
  /**
   * How the difficulty rating was arrived at. `"transcript-only"` means read
   * from the text and timings without listening; the UI surfaces it as
   * a "transcript-only rating" affordance. Absent means a human rated with audio.
   */
  ratedBy?: 'transcript-only';
  /**
   * True when the explanatory overlay text is authored by a human against the
   * audio. Absent or false means the overlay is auto-translated or otherwise
   * unverified; the UI must label overlay text as "auto-translated".
   * See ADR 0017.
   */
  overlayVerified?: boolean;
  /**
   * Publisher permission is on file for these episodes. Absent means the older
   * lesson episodes whose licence is declared per-field (CC BY-SA etc.).
   * Ingested podcast episodes carry `redistributable: true` alongside a source URL.
   */
  redistributable?: boolean;
```

- [ ] **Step 3: Add `translation` to seed cue shape**

At `catalog.seed.ts:147`, extend `SeedRow.transcript[]`:

```ts
  transcript: {
    time: string;
    seconds?: number;
    speaker?: string;
    text: string;
    highlight?: string;
    /** English translation of this cue, lifted into `TranscriptCue.translation`
     *  as `{ [pair.speaks]: text }` by the loader. Optional per cue — a cue
     *  that is just names or numbers can honestly have nothing under it. */
    translation?: string;
  }[];
```

- [ ] **Step 4: Add optional fields to `SeedRow`**

Extend `SeedRow` in `catalog.seed.ts` (near the existing optional fields):

```ts
  tocfl?: TocflBand;
  scriptConversion?: 'manual';
  ratedBy?: 'transcript-only';
  overlayVerified?: boolean;
  redistributable?: boolean;
  /** Remote audio URL. Distinct from `audioSrc` (a local file). If both are
   *  set the loader prefers `audioSrc`. */
  audioUrl?: string;
```

Import `TocflBand` at the top:

```ts
import type { DifficultyProfile, Episode, LearningLevel, Show, TocflBand, TranscriptCue } from './catalog.types';
```

- [ ] **Step 5: Wire the new fields through the loader**

In `catalog.seed.ts`, in the `episodes.set(id, { ... })` block starting around line 301, add mappings:

```ts
    episodes.set(id, {
      id,
      showId,
      title: row.episode,
      description: authoredIn(pair, row.description),
      durationSeconds: parseDurationSeconds(row.duration),
      audioUrl: row.audioSrc ?? row.audioUrl,
      publisherTranscript: row.verifiedLesson === true,
      learningGoal: authoredIn(pair, row.learningGoal),
      newWordCount: row.newWords,
      profile,
      transcriptLanguage: pair.learning,
      sourceUrl: row.sourceUrl,
      licence: row.licence,
      audioModified: row.audioModified,
      tocfl: row.tocfl,
      scriptConversion: row.scriptConversion,
      ratedBy: row.ratedBy,
      overlayVerified: row.overlayVerified,
      redistributable: row.redistributable,
      transcript,
      // ...existing vocabulary and questions mapping unchanged
```

And extend the `transcript` mapping (around line 286) to lift the cue translation:

```ts
    const transcript: TranscriptCue[] = row.transcript.map((cue) => ({
      startMs: timeToMs(cue),
      speaker: cue.speaker,
      text: cue.text,
      highlight: cue.highlight,
      translation: cue.translation === undefined
        ? undefined
        : { [pair.speaks]: cue.translation },
    }));
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: clean. If not, follow the errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/catalog/catalog.types.ts apps/api/src/catalog/catalog.seed.ts
git commit -m "Add TOCFL band and ingest-provenance fields to Episode + SeedRow"
```

---

## Task 4: SRT parser (TDD)

**Files:**
- Create: `apps/api/src/ingest/srt-parser.ts`
- Test: `apps/api/src/ingest/srt-parser.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/ingest/srt-parser.spec.ts`:

```ts
import { parseSrt } from './srt-parser';

describe('parseSrt', () => {
  it('reads one cue with start ms, end ms, and text', () => {
    const srt = [
      '1',
      '00:00:00,320 --> 00:00:05,860',
      'speaker_0: 茶歇中文第九十三集。',
      '',
    ].join('\n');

    expect(parseSrt(srt)).toEqual([
      { startMs: 320, endMs: 5_860, text: '茶歇中文第九十三集。' },
    ]);
  });

  it('joins multi-line cue text with a space and strips the speaker prefix', () => {
    const srt = [
      '1',
      '00:00:00,000 --> 00:00:04,000',
      'speaker_0: 第一行',
      '第二行',
      '',
    ].join('\n');

    expect(parseSrt(srt)[0].text).toBe('第一行 第二行');
  });

  it('reads multiple cues separated by blank lines', () => {
    const srt = [
      '1',
      '00:00:00,000 --> 00:00:02,000',
      'a',
      '',
      '2',
      '00:00:03,000 --> 00:00:05,000',
      'b',
      '',
    ].join('\n');

    const cues = parseSrt(srt);
    expect(cues.length).toBe(2);
    expect(cues[1]).toEqual({ startMs: 3_000, endMs: 5_000, text: 'b' });
  });

  it('leaves a cue without a speaker prefix untouched', () => {
    const srt = [
      '1',
      '00:00:00,000 --> 00:00:01,000',
      'plain text',
      '',
    ].join('\n');

    expect(parseSrt(srt)[0].text).toBe('plain text');
  });
});
```

- [ ] **Step 2: Verify the test fails**

Run:

```bash
npx jest apps/api/src/ingest/srt-parser.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the parser**

Create `apps/api/src/ingest/srt-parser.ts`:

```ts
/**
 * Minimal SRT parser for ElevenLabs-shaped files.
 *
 * The transcripts under transcripts/ carry a speaker prefix (`speaker_0: …`)
 * that the diarizer wrote in and that a learner would not want under their
 * cue. It is stripped here; the diarization data itself is read from
 * transcript.json, not from the SRT.
 */

export interface SrtCue {
  startMs: number;
  endMs: number;
  text: string;
}

const TIMING = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
const SPEAKER_PREFIX = /^speaker_\d+:\s*/;

function toMs(h: string, m: string, s: string, ms: string): number {
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(ms);
}

export function parseSrt(source: string): SrtCue[] {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n\n+/);
  const cues: SrtCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.length > 0);
    if (lines.length < 2) continue;

    // Index line optional but usually present; find the timing line.
    const timingIndex = lines.findIndex((line) => TIMING.test(line));
    if (timingIndex === -1) continue;
    const match = TIMING.exec(lines[timingIndex])!;

    const startMs = toMs(match[1], match[2], match[3], match[4]);
    const endMs = toMs(match[5], match[6], match[7], match[8]);

    const textLines = lines.slice(timingIndex + 1);
    const text = textLines
      .join(' ')
      .replace(SPEAKER_PREFIX, '')
      .trim();

    cues.push({ startMs, endMs, text });
  }

  return cues;
}
```

- [ ] **Step 4: Verify the test passes**

```bash
npx jest apps/api/src/ingest/srt-parser.spec.ts
```

Expected: PASS, all four tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ingest/srt-parser.ts apps/api/src/ingest/srt-parser.spec.ts
git commit -m "Add SRT parser for ingest"
```

---

## Task 5: Simplified-only character probe (TDD)

**Files:**
- Create: `apps/api/src/ingest/simplified-probe.ts`
- Test: `apps/api/src/ingest/simplified-probe.spec.ts`

The probe catches "a Simplified file was not converted at all" — not "the conversion missed a character." It is a conservative safety net against silently ingesting Simplified as Traditional. It does *not* attempt the round-trip validation ADR 0006 forbids.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/ingest/simplified-probe.spec.ts`:

```ts
import { containsSimplifiedOnlyCharacters } from './simplified-probe';

describe('containsSimplifiedOnlyCharacters', () => {
  it('is true for a Simplified sentence', () => {
    // From TeaTime ep 93: uses 这 说 时 会 电 视 边
    expect(containsSimplifiedOnlyCharacters('这个视频里的交通工具会说话'))
      .toBe(true);
  });

  it('is false for a Traditional sentence', () => {
    // The same idea in Traditional: 這 說 時 會 電 視 邊
    expect(containsSimplifiedOnlyCharacters('這個視頻裡的交通工具會說話'))
      .toBe(false);
  });

  it('is false for a mixed English/Chinese sentence in Traditional', () => {
    expect(containsSimplifiedOnlyCharacters('SpaceX 的火箭慢慢地回到了地上'))
      .toBe(false);
  });

  it('is false for an empty string', () => {
    expect(containsSimplifiedOnlyCharacters('')).toBe(false);
  });
});
```

- [ ] **Step 2: Verify the test fails**

```bash
npx jest apps/api/src/ingest/simplified-probe.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the probe**

Create `apps/api/src/ingest/simplified-probe.ts`:

```ts
/**
 * A conservative set of characters that exist only in Simplified Chinese.
 * Each of these has a distinct Traditional form; a well-converted or
 * natively-Traditional text has none of them.
 *
 * This set is intentionally small. Its job is to catch "a Simplified file was
 * not converted at all", not to validate a conversion — validating conversions
 * requires a round-trip lookup that ADR 0006 forbids on principle.
 */
const SIMPLIFIED_ONLY = new Set(
  Array.from(
    '说这时会学国语视频电门见觉边长汉们个书买卖钱银广场发达开关问题实现应该经验对错',
  ),
);

export function containsSimplifiedOnlyCharacters(text: string): boolean {
  for (const character of text) {
    if (SIMPLIFIED_ONLY.has(character)) return true;
  }
  return false;
}
```

- [ ] **Step 4: Verify the test passes**

```bash
npx jest apps/api/src/ingest/simplified-probe.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ingest/simplified-probe.ts apps/api/src/ingest/simplified-probe.spec.ts
git commit -m "Add Simplified-only character probe for ingest safety"
```

---

## Task 6: Show mapping table (TDD)

**Files:**
- Create: `apps/api/src/ingest/show-mapping.ts`
- Test: `apps/api/src/ingest/show-mapping.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/ingest/show-mapping.spec.ts`:

```ts
import { resolveShow } from './show-mapping';

describe('resolveShow', () => {
  it('resolves a Taiwan-native show with no scriptConversion', () => {
    const show = resolveShow('大人的Small-Talk');
    expect(show).toEqual({
      showId: 'daren-small-talk',
      title: '大人的 Small Talk',
      publisher: '大人學',
      scriptConversion: undefined,
    });
  });

  it('resolves an originally-Simplified show with scriptConversion "manual"', () => {
    const show = resolveShow('TeaTime-Chinese-茶歇中文');
    expect(show.scriptConversion).toBe('manual');
    expect(show.showId).toBe('teatime-chinese');
  });

  it('throws for an unknown folder name', () => {
    expect(() => resolveShow('Unknown-Show')).toThrow(/not in the show mapping/);
  });
});
```

- [ ] **Step 2: Verify the test fails**

```bash
npx jest apps/api/src/ingest/show-mapping.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the mapping**

Create `apps/api/src/ingest/show-mapping.ts`:

```ts
/**
 * The six-show mapping the podcast ingest is scoped to.
 *
 * `showId` is a Latin slug — Chinese titles produce `""` from the seed loader's
 * `slug()` and would collide, so each show declares its id explicitly. The
 * `scriptConversion` flag records whether the folder's transcript files were
 * converted to Traditional by the owner outside the ingest, per ADR 0010 and
 * the podcast ingest design.
 *
 * Adding a seventh show is a change here. The ingest fails loudly on any
 * folder name not in this table, which is the point — a stray directory in
 * transcripts/ should not silently become a show.
 */

export interface ShowMapping {
  showId: string;
  title: string;
  publisher: string;
  /** Present only on shows whose source was Simplified and the owner converted. */
  scriptConversion?: 'manual';
}

const MAPPING: Record<string, ShowMapping> = {
  '大人的Small-Talk': {
    showId: 'daren-small-talk',
    title: '大人的 Small Talk',
    publisher: '大人學',
  },
  '法客電台-BY-法律白話文運動-Plain-Law-Movement': {
    showId: 'plain-law-movement',
    title: '法客電台',
    publisher: '法律白話文運動',
  },
  '電扶梯走左邊-with-Jacky-Left-Side-Escalator': {
    showId: 'left-side-escalator',
    title: '電扶梯走左邊 with Jacky',
    publisher: 'Jacky',
  },
  '馬力歐陪你喝一杯': {
    showId: 'mario-drinks-with-you',
    title: '馬力歐陪你喝一杯',
    publisher: '馬力歐',
  },
  'TeaTime-Chinese-茶歇中文': {
    showId: 'teatime-chinese',
    title: 'TeaTime Chinese 茶歇中文',
    publisher: 'Nathan',
    scriptConversion: 'manual',
  },
  'Learning-Chinese-through-Stories': {
    showId: 'learning-chinese-through-stories',
    title: 'Learning Chinese through Stories',
    publisher: 'Journey to Chinese',
    scriptConversion: 'manual',
  },
};

export function resolveShow(folderName: string): ShowMapping {
  const mapping = MAPPING[folderName];
  if (!mapping) {
    throw new Error(
      `Folder "${folderName}" is not in the show mapping. ` +
        `Add it to apps/api/src/ingest/show-mapping.ts or move it out of transcripts/.`,
    );
  }
  return mapping;
}

export function knownShowFolders(): readonly string[] {
  return Object.keys(MAPPING);
}
```

- [ ] **Step 4: Verify the test passes**

```bash
npx jest apps/api/src/ingest/show-mapping.spec.ts
```

Expected: PASS.

If the publisher fields ("Jacky", "馬力歐" etc.) look wrong, correct them from each folder's `metadata.json:podcast_title` before shipping. The mapping is authored during this task and reviewed by the design owner.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ingest/show-mapping.ts apps/api/src/ingest/show-mapping.spec.ts
git commit -m "Add six-show mapping table for podcast ingest"
```

---

## Task 7: Rate-episode helpers — cpm, pauses, speaker count (TDD)

**Files:**
- Create: `apps/api/src/ingest/rate-episode.ts`
- Test: `apps/api/src/ingest/rate-episode.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/ingest/rate-episode.spec.ts`:

```ts
import { cpmOverSpeechSpan, pauseCount, distinctSpeakers } from './rate-episode';

/**
 * An ElevenLabs Scribe v2 word: only the fields we use.
 */
type Word = { text: string; start: number; end: number; type?: string; speaker_id?: string };

describe('cpmOverSpeechSpan (per ADR 0013)', () => {
  it('counts Han characters over the first-onset-to-last-offset span', () => {
    // 6 Han characters spoken across 4 seconds of speech span.
    const words: Word[] = [
      { text: '海', start: 0.0, end: 0.5, type: 'word' },
      { text: '山', start: 0.5, end: 1.0, type: 'word' },
      { text: '漁', start: 2.0, end: 2.5, type: 'word' },
      { text: '港', start: 2.5, end: 3.0, type: 'word' },
      { text: '海', start: 3.0, end: 3.5, type: 'word' },
      { text: '峽', start: 3.5, end: 4.0, type: 'word' },
    ];
    // 6 chars over 4.0 s = 90 cpm
    expect(cpmOverSpeechSpan(words)).toBe(90);
  });

  it('excludes digits from the character count', () => {
    const words: Word[] = [
      { text: '第', start: 0, end: 1, type: 'word' },
      { text: '3', start: 1, end: 2, type: 'word' },
      { text: '集', start: 2, end: 3, type: 'word' },
    ];
    // 2 chars over 3 seconds = 40 cpm
    expect(cpmOverSpeechSpan(words)).toBe(40);
  });

  it('excludes leading and trailing silence', () => {
    const words: Word[] = [
      { text: '海', start: 5.0, end: 5.5, type: 'word' },
      { text: '山', start: 6.0, end: 6.5, type: 'word' },
    ];
    // speech span 5.0 → 6.5 = 1.5 s, 2 chars → 80 cpm
    expect(cpmOverSpeechSpan(words)).toBe(80);
  });

  it('returns 0 for empty input', () => {
    expect(cpmOverSpeechSpan([])).toBe(0);
  });
});

describe('pauseCount', () => {
  it('counts inter-word gaps of at least the threshold', () => {
    const words: Word[] = [
      { text: 'a', start: 0.0, end: 1.0 },
      { text: 'b', start: 1.2, end: 2.0 }, // 0.2 gap — below 0.5
      { text: 'c', start: 3.0, end: 4.0 }, // 1.0 gap — counted
    ];
    expect(pauseCount(words, 0.5)).toBe(1);
  });
});

describe('distinctSpeakers', () => {
  it('counts the number of unique speaker_id values, ignoring undefined', () => {
    const words: Word[] = [
      { text: 'a', start: 0, end: 1, speaker_id: 'speaker_0' },
      { text: 'b', start: 1, end: 2, speaker_id: 'speaker_1' },
      { text: 'c', start: 2, end: 3, speaker_id: 'speaker_0' },
      { text: 'd', start: 3, end: 4 },
    ];
    expect(distinctSpeakers(words)).toBe(2);
  });

  it('returns 1 when no speaker_id is present (safe default)', () => {
    const words: Word[] = [{ text: 'a', start: 0, end: 1 }];
    expect(distinctSpeakers(words)).toBe(1);
  });
});
```

- [ ] **Step 2: Verify the tests fail**

```bash
npx jest apps/api/src/ingest/rate-episode.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the helpers**

Create `apps/api/src/ingest/rate-episode.ts`:

```ts
/**
 * Speech-rate and structural helpers for ingesting podcast episodes.
 *
 * `cpmOverSpeechSpan` implements ADR 0013: characters (Han, digits excluded)
 * over the speech span, first onset to last offset, internal pauses in,
 * leading and trailing silence out. It is the same convention the seed
 * catalogue documents and it is the number the ranking uses; nothing here
 * should trust an authored speed value.
 */

interface Word {
  text: string;
  start: number;
  end: number;
  type?: string;
  speaker_id?: string;
}

const HAN = /[一-鿿]/u;

function isSpokenWord(word: Word): boolean {
  return word.type === undefined || word.type === 'word';
}

function countHanCharacters(text: string): number {
  let count = 0;
  for (const character of text) {
    if (HAN.test(character)) count += 1;
  }
  return count;
}

export function cpmOverSpeechSpan(words: Word[]): number {
  const spoken = words.filter(isSpokenWord);
  if (spoken.length === 0) return 0;

  const firstOnset = spoken[0].start;
  const lastOffset = spoken[spoken.length - 1].end;
  const spanSeconds = lastOffset - firstOnset;
  if (spanSeconds <= 0) return 0;

  const characters = spoken.reduce((sum, word) => sum + countHanCharacters(word.text), 0);
  return Math.round((characters / spanSeconds) * 60);
}

export function pauseCount(words: Word[], thresholdSeconds: number): number {
  const spoken = words.filter(isSpokenWord);
  let count = 0;
  for (let i = 1; i < spoken.length; i += 1) {
    if (spoken[i].start - spoken[i - 1].end >= thresholdSeconds) count += 1;
  }
  return count;
}

export function distinctSpeakers(words: Word[]): number {
  const speakers = new Set<string>();
  for (const word of words) {
    if (word.speaker_id) speakers.add(word.speaker_id);
  }
  return Math.max(1, speakers.size);
}
```

- [ ] **Step 4: Verify the tests pass**

```bash
npx jest apps/api/src/ingest/rate-episode.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ingest/rate-episode.ts apps/api/src/ingest/rate-episode.spec.ts
git commit -m "Add cpm/pause/speaker helpers per ADR 0013 for ingest"
```

---

## Task 8: Author per-episode ratings data

**Files:**
- Create: `apps/api/src/ingest/data/podcast-ratings.json`

> ⚠️ **This task authors content, not code.** The engineer executing it should not invent ratings mechanically — the file's contents are authored by reading each transcript and applying the rating methodology in the spec (spec §"Rating methodology (transcript-only)"). If you are not the design owner and cannot read Traditional Chinese fluently enough to apply the methodology, escalate.

**Schema:** one entry per episode folder path, keyed by `showFolder/episodeFolder`. Every entry has:

```json
{
  "level": "Beginner | Intermediate | Advanced",
  "tocfl": "Novice 1 | Novice 2 | Level 1 | ... | Advanced High",
  "topic": "e.g. Interviews, Society, Business, Places, Health",
  "tags": ["taiwan", "conversation", ...],
  "levelReason": {
    "en": "A ~40-word sentence stating one WHY (pauses, vocab, topic, speaker structure) and one WHAT (numbers).",
    "vi": "Vietnamese machine-translation of the English."
  },
  "learningGoal": {
    "en": "One sentence stating what the learner walks away with.",
    "vi": "Vietnamese machine-translation."
  },
  "description": {
    "en": "The ~30-word blurb a learner reads to decide whether to open this episode.",
    "vi": "Vietnamese machine-translation."
  }
}
```

- [ ] **Step 1: Draft one worked example**

Read `transcripts/TeaTime-Chinese-茶歇中文/2024-11-23-EP93-张骞和丝绸之路-Zhang-Qian-and-the-Silk-Road/transcript.trad.json` (or `transcript.json` if converted in place) and its `metadata.json`. Compute `cpm` with the Task 7 helpers via a quick `node -e` if useful.

Write the entry for it as the first key in `podcast-ratings.json`:

```json
{
  "TeaTime-Chinese-茶歇中文/2024-11-23-EP93-张骞和丝绸之路-Zhang-Qian-and-the-Silk-Road": {
    "level": "Intermediate",
    "tocfl": "Level 3",
    "topic": "History",
    "tags": ["history", "china", "silk-road", "narrator", "mainland-mandarin-converted"],
    "levelReason": {
      "en": "One narrator, 155 cpm, with a full pause between most sentences — the pace is Intermediate but the ancient-history vocabulary (絲綢, 使者, 商路) pushes the load past Beginner.",
      "vi": "Một người kể, 155 cpm, với khoảng lặng giữa hầu hết các câu — tốc độ là Trung cấp nhưng từ vựng lịch sử cổ đại (絲綢, 使者, 商路) đẩy tải lên trên Sơ cấp."
    },
    "learningGoal": {
      "en": "Follow a narrated history episode set in the Han dynasty and pick up the Chinese vocabulary for trade routes, emissaries, and the Silk Road.",
      "vi": "Theo dõi một tập lịch sử được kể lại từ triều đại nhà Hán và tiếp thu từ vựng tiếng Trung về các tuyến đường thương mại, sứ giả và Con đường tơ lụa."
    },
    "description": {
      "en": "Nathan tells the story of Zhang Qian's mission from Han China westward and how it opened the Silk Road, at a teaching pace with pauses between clauses.",
      "vi": "Nathan kể câu chuyện về sứ mệnh của Trương Khiên từ nhà Hán Trung Quốc đi về phía tây và cách nó mở ra Con đường tơ lụa, với tốc độ giảng dạy có khoảng lặng giữa các mệnh đề."
    }
  }
}
```

- [ ] **Step 2: Author entries for all ~24 folders**

Walk every folder under `transcripts/*/*/`. For each, read the transcript (~5–15 minutes per episode at reading speed), apply the methodology, and add an entry.

The ingest script (Task 10) will fail loudly on any folder without a matching entry, so the audit is enforced.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ingest/data/podcast-ratings.json
git commit -m "Author transcript-only ratings for the 24 ingested podcast episodes"
```

---

## Task 9: Main ingest script

**Files:**
- Create: `apps/api/src/ingest/podcasts-from-folder.ts`
- Test: `apps/api/src/ingest/podcasts-from-folder.spec.ts`

- [ ] **Step 1: Write the integration test**

Create `apps/api/src/ingest/podcasts-from-folder.spec.ts`:

```ts
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ingestFolder } from './podcasts-from-folder';

/**
 * Builds a minimal transcripts/<show>/<episode>/ fixture and asserts the
 * ingest produces the expected seed row + overlay entries.
 */
describe('ingestFolder', () => {
  function makeFixture(): {
    source: string;
    ratings: string;
  } {
    const source = mkdtempSync(join(tmpdir(), 'ingest-'));
    const show = join(source, 'TeaTime-Chinese-茶歇中文');
    const episode = join(show, '2024-11-23-EP93-fixture');
    mkdirSync(episode, { recursive: true });

    writeFileSync(join(episode, 'metadata.json'), JSON.stringify({
      title: '第九十三集：測試',
      audio_url: 'https://example.test/ep93.mp3',
      page_url: 'https://example.test/ep93',
      podcast_title: 'TeaTime Chinese 茶歇中文',
      published: 'Sat, 23 Nov 2024 08:00:00 +0000',
    }));

    writeFileSync(join(episode, 'transcript.json'), JSON.stringify({
      language: 'zho',
      audio_duration_seconds: 4.0,
      words: [
        { text: '這', start: 0.0, end: 0.5, type: 'word', speaker_id: 'speaker_0' },
        { text: '是', start: 0.5, end: 1.0, type: 'word', speaker_id: 'speaker_0' },
        { text: '測', start: 2.0, end: 2.5, type: 'word', speaker_id: 'speaker_0' },
        { text: '試', start: 2.5, end: 3.0, type: 'word', speaker_id: 'speaker_0' },
      ],
    }));

    writeFileSync(join(episode, 'transcript.srt'),
      '1\n00:00:00,000 --> 00:00:03,000\nspeaker_0: 這是測試\n');
    writeFileSync(join(episode, 'bilingual.en.srt'),
      '1\n00:00:00,000 --> 00:00:03,000\nThis is a test\n');
    writeFileSync(join(episode, 'bilingual.vi.srt'),
      '1\n00:00:00,000 --> 00:00:03,000\nĐây là một bài kiểm tra\n');

    const ratings = join(source, 'ratings.json');
    writeFileSync(ratings, JSON.stringify({
      'TeaTime-Chinese-茶歇中文/2024-11-23-EP93-fixture': {
        level: 'Beginner',
        tocfl: 'Novice 2',
        topic: 'Test',
        tags: ['test'],
        levelReason: { en: 'A test.', vi: 'Một bài kiểm tra.' },
        learningGoal: { en: 'Test.', vi: 'Bài kiểm tra.' },
        description: { en: 'A test episode.', vi: 'Một tập kiểm tra.' },
      },
    }));

    return { source, ratings };
  }

  it('emits a seed row and two overlay entries for a fixture episode', () => {
    const { source, ratings } = makeFixture();
    const outDir = mkdtempSync(join(tmpdir(), 'ingest-out-'));
    const seedPath = join(outDir, 'seed.json');
    const overlayViPath = join(outDir, 'overlay.vi.json');

    ingestFolder({
      sourceDir: source,
      ratingsFile: ratings,
      seedOut: seedPath,
      overlayViOut: overlayViPath,
      firstEpisodeId: 200,
    });

    const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
    expect(seed).toHaveLength(1);
    expect(seed[0]).toMatchObject({
      id: 200,
      showId: 'teatime-chinese',
      title: 'TeaTime Chinese 茶歇中文',
      episode: '第九十三集：測試',
      description: 'A test episode.',
      level: 'Beginner',
      tocfl: 'Novice 2',
      speed: '≈ 80 cpm',
      newWords: 0,
      audioUrl: 'https://example.test/ep93.mp3',
      sourceUrl: 'https://example.test/ep93',
      scriptConversion: 'manual',
      ratedBy: 'transcript-only',
      overlayVerified: false,
      redistributable: true,
      vocabulary: [],
      questions: [],
    });
    expect(seed[0].transcript).toHaveLength(1);
    expect(seed[0].transcript[0]).toMatchObject({
      time: '00:00',
      text: '這是測試',
      translation: 'This is a test',
    });

    const overlayVi = JSON.parse(readFileSync(overlayViPath, 'utf8'));
    expect(overlayVi['200']).toMatchObject({
      levelReason: 'Một bài kiểm tra.',
      learningGoal: 'Bài kiểm tra.',
      description: 'Một tập kiểm tra.',
      transcript: { '00:00': 'Đây là một bài kiểm tra' },
      vocabulary: {},
      questions: [],
    });
  });

  it('throws when a folder has no ratings entry', () => {
    const { source } = makeFixture();
    const outDir = mkdtempSync(join(tmpdir(), 'ingest-out-'));
    const emptyRatings = join(outDir, 'empty.json');
    writeFileSync(emptyRatings, '{}');

    expect(() => ingestFolder({
      sourceDir: source,
      ratingsFile: emptyRatings,
      seedOut: join(outDir, 'seed.json'),
      overlayViOut: join(outDir, 'overlay.vi.json'),
      firstEpisodeId: 200,
    })).toThrow(/no ratings entry/);
  });

  it('throws when a transcript still contains Simplified-only characters', () => {
    const { source, ratings } = makeFixture();
    const bad = join(source, 'TeaTime-Chinese-茶歇中文', '2024-11-23-EP93-fixture', 'transcript.json');
    writeFileSync(bad, JSON.stringify({
      language: 'zho',
      audio_duration_seconds: 4.0,
      words: [
        { text: '这', start: 0.0, end: 1.0, type: 'word' }, // Simplified 这
        { text: '是', start: 1.0, end: 2.0, type: 'word' },
      ],
    }));

    const outDir = mkdtempSync(join(tmpdir(), 'ingest-out-'));
    expect(() => ingestFolder({
      sourceDir: source,
      ratingsFile: ratings,
      seedOut: join(outDir, 'seed.json'),
      overlayViOut: join(outDir, 'overlay.vi.json'),
      firstEpisodeId: 200,
    })).toThrow(/Simplified/);
  });
});
```

- [ ] **Step 2: Verify the tests fail**

```bash
npx jest apps/api/src/ingest/podcasts-from-folder.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the script**

Create `apps/api/src/ingest/podcasts-from-folder.ts`:

```ts
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { parseSrt } from './srt-parser';
import { containsSimplifiedOnlyCharacters } from './simplified-probe';
import { resolveShow } from './show-mapping';
import { cpmOverSpeechSpan, distinctSpeakers } from './rate-episode';

interface Word {
  text: string;
  start: number;
  end: number;
  type?: string;
  speaker_id?: string;
}

interface TranscriptJson {
  language: string;
  audio_duration_seconds: number;
  words: Word[];
}

interface Metadata {
  title: string;
  audio_url: string;
  page_url: string;
  podcast_title: string;
  published: string;
}

interface RatingEntry {
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  tocfl: string;
  topic: string;
  tags: string[];
  levelReason: { en: string; vi: string };
  learningGoal: { en: string; vi: string };
  description: { en: string; vi: string };
}

type RatingsFile = Record<string, RatingEntry>;

export interface IngestOptions {
  sourceDir: string;
  ratingsFile: string;
  seedOut: string;
  overlayViOut: string;
  firstEpisodeId: number;
}

function cueTime(startMs: number): string {
  const total = Math.round(startMs / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function assertTraditional(transcript: TranscriptJson, where: string): void {
  const sample = transcript.words.map((w) => w.text).join('');
  if (containsSimplifiedOnlyCharacters(sample)) {
    throw new Error(
      `${where}: transcript contains Simplified-only characters. ` +
        `Either it was never converted, or the conversion missed a run. ` +
        `Ingest refuses to proceed.`,
    );
  }
}

function buildTranscriptCues(
  transcript: TranscriptJson,
  bilingualEn: ReturnType<typeof parseSrt>,
): {
  time: string;
  seconds: number;
  text: string;
  translation?: string;
}[] {
  // Group words into cues by natural sentence boundaries — use the SRT cues
  // as the truth of "one cue" since ElevenLabs already segmented them, and
  // pull the Chinese text from transcript.srt via the same start-time key.
  // For fidelity we key everything on the English SRT's timing, which the
  // Chinese SRT shares. This means we read transcript.srt too.
  //
  // Simpler alternative used here: read transcript.srt directly; the shape
  // of both bilinguals matches it by design.
  throw new Error('Buildable via parseSrt of transcript.srt — implemented in step below');
}

export function ingestFolder(options: IngestOptions): void {
  const ratings = readJson<RatingsFile>(options.ratingsFile);
  const seed: unknown[] = [];
  const overlayVi: Record<string, unknown> = {};

  let nextId = options.firstEpisodeId;

  const showFolders = readdirSync(options.sourceDir)
    .filter((entry) => statSync(join(options.sourceDir, entry)).isDirectory())
    .sort();

  for (const showFolder of showFolders) {
    const show = resolveShow(showFolder);
    const showDir = join(options.sourceDir, showFolder);

    const episodeFolders = readdirSync(showDir)
      .filter((entry) => statSync(join(showDir, entry)).isDirectory())
      .sort();

    for (const episodeFolder of episodeFolders) {
      const episodeDir = join(showDir, episodeFolder);
      const key = `${showFolder}/${episodeFolder}`;
      const rating = ratings[key];
      if (!rating) {
        throw new Error(
          `${key}: no ratings entry in ${options.ratingsFile}. ` +
            `Add one before ingesting.`,
        );
      }

      const metadata = readJson<Metadata>(join(episodeDir, 'metadata.json'));
      const transcript = readJson<TranscriptJson>(join(episodeDir, 'transcript.json'));

      assertTraditional(transcript, key);

      const zhCues = parseSrt(readFileSync(join(episodeDir, 'transcript.srt'), 'utf8'));
      const enCues = parseSrt(readFileSync(join(episodeDir, 'bilingual.en.srt'), 'utf8'));
      const viCues = parseSrt(readFileSync(join(episodeDir, 'bilingual.vi.srt'), 'utf8'));

      const enByStart = new Map(enCues.map((cue) => [cue.startMs, cue.text]));
      const viByStart = new Map(viCues.map((cue) => [cue.startMs, cue.text]));

      // A silent-overwrite guard: two cues whose starts round to the same
      // second would map to the same overlay key and silently discard one.
      const seenKey = new Set<string>();
      for (const cue of zhCues) {
        const key = cueTime(cue.startMs);
        if (seenKey.has(key)) {
          throw new Error(
            `${showFolder}/${episodeFolder}: two cues round to overlay key ${key} — ` +
              `one would silently overwrite the other. Refusing to ingest.`,
          );
        }
        seenKey.add(key);
      }

      const cpm = cpmOverSpeechSpan(transcript.words);
      const speakerCount = distinctSpeakers(transcript.words);
      const durationSeconds = Math.round(transcript.audio_duration_seconds);

      const id = nextId;
      nextId += 1;

      seed.push({
        id,
        showId: show.showId,
        title: show.title,
        author: show.publisher,
        topic: rating.topic,
        duration: `${durationSeconds} sec`,
        episode: metadata.title,
        description: rating.description.en,
        tags: rating.tags,
        level: rating.level,
        tocfl: rating.tocfl,
        speed: `≈ ${cpm} cpm`,
        newWords: 0,
        levelReason: rating.levelReason.en,
        learningGoal: rating.learningGoal.en,
        audioUrl: metadata.audio_url,
        sourceUrl: metadata.page_url,
        ...(show.scriptConversion && { scriptConversion: show.scriptConversion }),
        ratedBy: 'transcript-only',
        overlayVerified: false,
        redistributable: true,
        transcript: zhCues.map((cue) => ({
          time: cueTime(cue.startMs),
          seconds: Math.round(cue.startMs / 100) / 10,
          text: cue.text,
          translation: enByStart.get(cue.startMs),
        })),
        vocabulary: [],
        questions: [],
      });

      const viTranscript: Record<string, string> = {};
      for (const cue of zhCues) {
        const translation = viByStart.get(cue.startMs);
        if (translation) viTranscript[cueTime(cue.startMs)] = translation;
      }

      overlayVi[String(id)] = {
        levelReason: rating.levelReason.vi,
        learningGoal: rating.learningGoal.vi,
        description: rating.description.vi,
        transcript: viTranscript,
        vocabulary: {},
        questions: [],
      };
    }
  }

  writeFileSync(options.seedOut, JSON.stringify(seed, null, 2) + '\n', 'utf8');
  writeFileSync(options.overlayViOut, JSON.stringify(overlayVi, null, 2) + '\n', 'utf8');
}

// Allow direct invocation: npx tsx apps/api/src/ingest/podcasts-from-folder.ts --source ... --out ... --overlay-vi ...
if (require.main === module) {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    if (i === -1) throw new Error(`Missing flag: ${flag}`);
    return argv[i + 1];
  };
  ingestFolder({
    sourceDir: get('--source'),
    ratingsFile: get('--ratings'),
    seedOut: get('--out'),
    overlayViOut: get('--overlay-vi'),
    firstEpisodeId: 200,
  });
}
```

Delete the `buildTranscriptCues` stub declared above — it was replaced by the inline `zhCues.map(…)` in `ingestFolder`.

- [ ] **Step 4: Verify the tests pass**

```bash
npx jest apps/api/src/ingest/podcasts-from-folder.spec.ts
```

Expected: PASS (three tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ingest/podcasts-from-folder.ts apps/api/src/ingest/podcasts-from-folder.spec.ts
git commit -m "Add podcasts-from-folder ingest script"
```

---

## Task 10: Register the seed file with the loader

**Files:**
- Modify: `apps/api/src/catalog/catalog.seed.ts` (SEED_FILES)

- [ ] **Step 1: Add the entry**

At `catalog.seed.ts:69-72`, extend `SEED_FILES`:

```ts
const SEED_FILES: SeedFile[] = [
  { pair: SEED_PAIR, file: 'catalog.seed.json' },
  { pair: { speaks: 'en', learning: 'zh-Hant' }, file: 'catalog.en-zh-Hant.seed.json' },
  { pair: { speaks: 'en', learning: 'zh-Hant' }, file: 'catalog.en-zh-Hant.podcasts.seed.json' },
];
```

- [ ] **Step 2: Verify the API still boots without the seed file**

The seed file does not exist yet (produced in Task 12). Confirm the loader complains loudly rather than silently no-oping:

```bash
node -e "require('./apps/api/dist/main.js')" 2>&1 | grep -i "podcasts.seed"
```

Expected: an error like `ENOENT ... catalog.en-zh-Hant.podcasts.seed.json`. That is correct behaviour — a declared seed file must exist.

- [ ] **Step 3: Do not commit yet**

Wait until Task 12 has produced the file. Otherwise the API is boot-broken between commits. If subagent-driven-development requires a commit here, add a stub `[]` seed file:

```bash
echo '[]' > apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json
git add apps/api/src/catalog/catalog.seed.ts apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json
git commit -m "Wire catalog.en-zh-Hant.podcasts.seed.json into SEED_FILES (stub)"
```

Task 12 will overwrite the stub with real content.

---

## Task 11: Wire Vietnamese overlay

**Files:**
- Modify: `apps/api/src/catalog/catalog.overlay.ts` (OVERLAY_LANGUAGES)

- [ ] **Step 1: Add `vi` to `OVERLAY_LANGUAGES`**

At `catalog.overlay.ts:89`:

```ts
const OVERLAY_LANGUAGES = ['zh-Hant', 'vi'] as const satisfies readonly LanguageTag[];
```

The loader picks up `catalog.vi.json` from the same `data/` directory, no other change needed.

- [ ] **Step 2: Stub the overlay file**

Create `apps/api/src/catalog/data/catalog.vi.json` with `{}` so the loader can boot before Task 12 writes the real content:

```bash
echo '{}' > apps/api/src/catalog/data/catalog.vi.json
```

- [ ] **Step 3: Verify boot**

```bash
npm run build
node apps/api/dist/main.js &
sleep 2
curl -s localhost:3001/api/health | jq
kill %1
```

Expected: `/api/health` answers OK.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/catalog/catalog.overlay.ts apps/api/src/catalog/data/catalog.vi.json
git commit -m "Wire Vietnamese overlay into OVERLAY_LANGUAGES with an empty stub"
```

---

## Task 12: Run the ingest, commit the generated data

**Files:**
- Generated: `apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json`
- Generated: `apps/api/src/catalog/data/catalog.vi.json` (overwrites the stub)

- [ ] **Step 1: Run the ingest**

```bash
npx tsx apps/api/src/ingest/podcasts-from-folder.ts \
  --source /Users/lemo/code/repo/playground/podcastdiscovery/transcripts \
  --ratings apps/api/src/ingest/data/podcast-ratings.json \
  --out apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json \
  --overlay-vi apps/api/src/catalog/data/catalog.vi.json
```

Expected: no output on success. Two files written. If it throws about missing ratings entries or Simplified characters, fix the underlying issue (Task 8's ratings file, or the owner's transcript conversion), and re-run.

- [ ] **Step 2: Sanity-check the output**

```bash
jq 'length' apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json
```

Expected: ~24.

```bash
jq 'keys | length' apps/api/src/catalog/data/catalog.vi.json
```

Expected: same number.

```bash
jq '.[0] | {id, showId, title, episode, level, tocfl, speed}' \
  apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json
```

Sanity check the first row by eye. `speed` should be `≈ N cpm` with a plausible N (100–250 for real Mandarin speech).

- [ ] **Step 3: Boot and probe the API**

```bash
npm run build
node apps/api/dist/main.js &
sleep 2

# The two directions the ingest ships in
curl -s 'localhost:3001/api/episodes?speaks=en&learning=zh-Hant' | jq 'length'
curl -s 'localhost:3001/api/episodes?speaks=vi&learning=zh-Hant' | jq 'length'

# One ingested episode
curl -s localhost:3001/api/episodes/200 | jq '{id, tocfl, ratedBy, overlayVerified, audioUrl}'

kill %1
```

Expected: both directions carry the new count. The episode has the new fields populated.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json \
        apps/api/src/catalog/data/catalog.vi.json
git commit -m "Ingest 24 Mandarin podcast episodes into en→zh-Hant and vi→zh-Hant"
```

---

## Task 13: Hide the vocabulary tab and `newWords` line on empty-vocabulary episodes

**Files:**
- Modify: `apps/web/app/[speaks]/[learning]/episode/[id]/episode-learning.tsx` (~line 289, 318)
- Modify: `apps/web/app/[speaks]/[learning]/discover.tsx` (wherever `newWords` renders)

- [ ] **Step 1: Read the current episode-learning render**

```bash
sed -n '280,325p' apps/web/app/[speaks]/[learning]/episode/[id]/episode-learning.tsx
```

Identify the `<TabsTrigger value="vocabulary">` (line 289) and the `<TabsContent value="vocabulary">` (line 315). Wrap both in `episode.vocabulary.length > 0 &&`:

```tsx
{episode.vocabulary.length > 0 && (
  <TabsTrigger value="vocabulary" className="h-auto flex-none px-0 pb-4">
    Vocabulary <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{episode.vocabulary.length}</span>
  </TabsTrigger>
)}
```

And similarly for the `TabsContent`. Also verify no code below assumes the tab exists — set the default open tab to `transcript` if that is not already the case.

- [ ] **Step 2: Locate and gate `newWords` in the discovery card**

```bash
grep -n 'newWords\|newWordCount' apps/web/app/[speaks]/[learning]/discover.tsx
```

For each render site, wrap in `episode.newWordCount > 0 &&`.

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Open `http://localhost:3000/en/zh-Hant`:

- The old episodes (7 not in this pair; 102, 103, 104) still show their vocabulary tab and `newWords`.
- The new episodes (200+) show the transcript tab but no vocabulary tab. On the card, no `newWords` line.

Open `http://localhost:3000/vi/zh-Hant` — cards appear in Vietnamese (from the overlay). Same tab/newWords rules.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[speaks]/[learning]/episode/[id]/episode-learning.tsx \
        apps/web/app/[speaks]/[learning]/discover.tsx
git commit -m "Hide vocabulary tab and newWords line on episodes with vocabulary: []"
```

---

## Task 14: Add "transcript-only rating" and "auto-translated" affordances

**Files:**
- Modify: `apps/web/app/[speaks]/[learning]/episode/[id]/episode-learning.tsx`
- Modify: `apps/web/app/[speaks]/[learning]/discover.tsx`
- Modify: whichever component renders a `TranscriptCue.translation` (search for it)

- [ ] **Step 1: Find the level pill's render site**

```bash
grep -n 'level\|Level' apps/web/app/[speaks]/[learning]/discover.tsx | head -10
grep -n 'level\|Level' apps/web/app/[speaks]/[learning]/episode/[id]/episode-learning.tsx | head -10
```

Alongside the level pill, add a small marker when `episode.ratedBy === 'transcript-only'`:

```tsx
{episode.ratedBy === 'transcript-only' && (
  <span
    className="text-[10px] uppercase tracking-wide text-muted-foreground"
    title="Difficulty was rated from the transcript alone, not by listening."
  >
    (transcript-only rating)
  </span>
)}
```

Both the discovery card and the episode page.

- [ ] **Step 2: Find the transcript cue render site**

```bash
grep -rn 'translation' apps/web/app/ apps/web/components/ 2>/dev/null | grep -v node_modules
```

Wherever a cue's translation renders, gate an "auto-translated" label on `!episode.overlayVerified`:

```tsx
{cue.translation?.[speaks] && (
  <p className="text-sm text-muted-foreground">
    {cue.translation[speaks]}
    {episode.overlayVerified === false && (
      <span className="ml-1 text-[10px] uppercase tracking-wide">
        (auto-translated)
      </span>
    )}
  </p>
)}
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

- Discovery card for episode 200 shows "(transcript-only rating)" next to the level pill.
- Episode page shows the same next to the level, and each cue's translation shows "(auto-translated)" after the text.
- Episode 102 (an existing hand-rated episode) shows neither marker.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[speaks]/[learning]/episode/[id]/episode-learning.tsx \
        apps/web/app/[speaks]/[learning]/discover.tsx
# and any additional cue-render files
git commit -m "Label transcript-only ratings and auto-translated overlay cues"
```

---

## Task 15: End-to-end verification

**Files:** none modified.

- [ ] **Step 1: Full clean build**

```bash
rm -rf node_modules apps/*/node_modules
npm ci --include=dev
npm run lint && npm run typecheck && npm run build
```

Expected: all pass.

- [ ] **Step 2: Test suite**

```bash
npm test
```

Expected: existing 3 tests + the new ingest tests (SRT parser, Simplified probe, show mapping, rate helpers, ingest integration) all pass. 14 storage tests skip without `TEST_DATABASE_URL` (this is fine).

- [ ] **Step 3: Static export includes the new routes**

```bash
STATIC_EXPORT=1 npm run build --workspace @discopod/web
ls apps/web/out/en/zh-Hant/episode/ | head
ls apps/web/out/vi/zh-Hant/episode/ | head
```

Expected: episode IDs 200+ present in both trees.

- [ ] **Step 4: API boot + smoke**

```bash
node apps/api/dist/main.js &
sleep 2
curl -s localhost:3001/api/health | jq
curl -s 'localhost:3001/api/episodes?speaks=en&learning=zh-Hant' | jq 'length'
curl -s 'localhost:3001/api/episodes?speaks=vi&learning=zh-Hant' | jq 'length'
kill %1
```

Expected: `/api/health` OK. Both counts include the new episodes.

- [ ] **Step 5: Browser verification**

```bash
npm run dev
```

Visit each of these and confirm the assertion in the spec's "Verification" section:

- `http://localhost:3000/en/zh-Hant` — new episodes on discovery with TOCFL pills and "(transcript-only rating)" markers, no `newWords` lines, no vocabulary tabs on those episodes.
- `http://localhost:3000/vi/zh-Hant` — same episodes in Vietnamese overlay.
- `http://localhost:3000/en/zh-Hant/episode/200` — full transcript renders, remote audio plays, English cues carry "(auto-translated)" labels, no vocabulary tab.
- Existing episodes (102, 103, 104, VOA lessons where applicable) are unchanged — level pills, vocabulary tabs, `newWords` lines all present, no "(transcript-only)" marker.

- [ ] **Step 6: Nothing else to commit**

Everything has been committed as part of prior tasks.

---

## Post-plan self-review

**Spec coverage checked:**
- Pair `en → zh-Hant` — Task 12 (seed) + Task 15 (browser check)
- Pair `vi → zh-Hant` — Task 2 (`vi` added), Task 11 (overlay wired), Task 12 (data generated), Task 15 (browser check)
- Traditional script + `scriptConversion: "manual"` for the 2 converted shows — Task 6 (mapping declares it), Task 9 (ingest emits it)
- TOCFL band — Task 3 (field added), Task 8 (ratings author it), Task 9 (ingest emits it), Task 14 (UI shows it via existing level pill; TOCFL-specific pill deferred to a future UI slice)
- Ratings from transcript only — Task 8 (methodology), Task 14 (label affordance)
- Speech rate per ADR 0013 — Task 7 (helper), Task 9 (ingest uses it)
- Remote audio via `audioUrl` — Task 3 (field), Task 9 (ingest sets it), Task 5 loader chooses `audioSrc ?? audioUrl`
- Full episode — Task 9 (ingest passes all cues through)
- English + Vietnamese overlays with `overlayVerified: false` — Task 9 (ingest), Task 14 (UI label)
- `vocabulary: []` and `questions: []` — Task 9 (ingest emits empty), Task 13 (UI hides)
- One-shot script — Task 9, Task 12
- Seed file location — Task 10
- Episode id range 200+ — Task 9 (`firstEpisodeId: 200`)
- Show records via mapping — Task 6
- Publisher permission on file, `redistributable: true` — Task 9 (ingest sets), no UI branch needed (the field is metadata, not user-facing)
- 5 ADRs — Task 1
- Deployment public — implied by ADR 0015; no code change needed

**Not in this plan (deferred, per spec):**
- Dictionary tap-to-lookup (its own design)
- Player virtualisation and resume-from-position (its own design)
- TOCFL as a ranking input (its own design)
- UI chrome i18n for Vietnamese (its own design)
- Card footnote translating TOCFL → HSK for HSK-familiar learners
