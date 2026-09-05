# Ingest Mandarin podcasts from `transcripts/`

2026-09-05.

## What this is

Ingest ~24 real Mandarin podcast episodes from a local `transcripts/` folder into two
learner directions of the catalogue — `en → zh-Hant` and `vi → zh-Hant` — so DiscoPod
moves from three hand-authored episodes (7, 102, 103, 104) plus the VOA lessons to
something that ranks a real corpus, and adds Vietnamese as a learner language.

Source folder: `/Users/lemo/code/repo/playground/podcastdiscovery/transcripts/`. Six shows,
~24 episodes, each folder carrying `metadata.json` (title, audio URL, published date),
`transcript.json` (ElevenLabs Scribe v2 output with word-level timings and speaker
diarization), `transcript.srt`, `transcript.txt`, `bilingual.en.srt`, and
`bilingual.vi.srt` (machine translations, both cued to the same timings). Both
translations are used.

## What this is not

Not the RSS ingestion described in VISION and outlined in `apps/api/src/ingest/`. That
reads a feed at runtime; this reads a folder that is already on disk. The two are
different problems and this design does not build the general path.

Not the tap-to-lookup dictionary story, and not the player rework for long transcripts.
Both are deferred; see *Downstream work this defers* below.

## Decisions

| Piece | Decision |
| --- | --- |
| Pairs shipped | `en → zh-Hant` and `vi → zh-Hant`. Both driven by overlays from the same source folder. |
| UI chrome | Stays English. Localising the chrome (buttons, tabs, headers) is real work and orthogonal to ingest; deferred as its own slice. A Vietnamese learner sees Chinese cues + Vietnamese overlay + English chrome. Same shape as the existing `zh-Hant → en` pair. |
| Script | Traditional. 4 shows are native; 2 are Simplified converted manually by the owner before ingest. Converted episodes carry `scriptConversion: "manual"`. |
| Proficiency framework | **TOCFL** (Novice 1 → Advanced High) — closes ADR 0003 decision 7 for Mandarin |
| Difficulty rating source | Read every transcript, author `level` + TOCFL band + `levelReason` + `learningGoal` for **both** learner languages. Every rating carries `ratedBy: "transcript-only"`. The Vietnamese-language authored copy is machine-translated from the English and additionally marked `authoredBy: "auto-translated"`. No listening was involved. |
| Speed | Computed per ADR 0013 from ElevenLabs word timings — first onset to last offset, internal pauses in, leading and trailing silence out. Not trusted from any authored value. |
| Audio hosting | Remote `audio_url` from `metadata.json`. Nothing downloaded, nothing committed. |
| Length | Full episode. No excerpting. |
| English + Vietnamese overlays | Loaded from `bilingual.en.srt` and `bilingual.vi.srt`, both marked `overlayVerified: false`. The UI must label each as "auto-translated" or equivalent — the flag is required, not decorative. |
| Vocabulary | `vocabulary: []` on every ingested episode. Authored vocab is a lesson artifact; ingested episodes are not lessons. See ADR to be written. |
| Comprehension questions | `questions: []`. Same reasoning. |
| Ingest mechanism | One-shot Node script under `apps/api/src/ingest/`, emits one seed file and two overlay files, all checked into the repo. Not wired into boot. |
| Seed file | `apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json`. Listed in `SEED_FILES` alongside the existing seed. The seed is *pair-neutral* — one row per episode, carrying `Localized` copy keyed by both `en` and `vi`. The pair a card ends up on is decided by content availability, not by the file's name. |
| Overlay files | `catalog.en-zh-Hant.podcasts.overlay.json` (English cue translations) and `catalog.vi-zh-Hant.podcasts.overlay.json` (Vietnamese cue translations). Each keyed by `MM:SS` of `Math.round(startMs/1000)`. |
| Episode id range | **200–299**. Global-unique across all seed files; the loader throws on collision. |
| Show records | One per source folder, `showId` slugged from a Latinised podcast title. `slug()` on a Chinese title returns `""` (the trap ep 102 walked into), so `showId` is authored, not derived. |
| Licence | Marked `redistributable: true`. Publisher permission is on file with the owner; the seed records the claim, not the paperwork. Per-episode `sourceUrl` (from `page_url`) and remote `audioUrl` (from `audio_url`) are always populated. |
| Deployment | Public. These ship to `discopod-web.onrender.com` alongside existing episodes. |

## Data flow

```
transcripts/<show>/<episode>/
├── metadata.json             # title, audio_url, page_url, published, podcast_title
├── transcript.json           # ElevenLabs Scribe v2: cued text + word timings, diarization
├── transcript.srt            # cued text (fallback)
├── bilingual.en.srt          # machine-translated English cues (same timings)
└── bilingual.vi.srt          # machine-translated Vietnamese cues (same timings)

Note: transcript.json / transcript.srt are already Traditional for every folder.
The four Taiwan shows are native Traditional. The two originally-Simplified shows
(TeaTime-Chinese, Learning-Chinese-through-Stories) were converted in place by the
owner. There is no per-file marker; the distinction is a hardcoded list in the
ingest script (see below).
                    │
                    ▼
        ingest script
                    │
                    ├─►  catalog.en-zh-Hant.podcasts.seed.json          (episodes 200–224
                    │                                                    with Localized copy
                    │                                                    keyed by en + vi)
                    ├─►  catalog.en-zh-Hant.podcasts.overlay.json       (English cues)
                    └─►  catalog.vi-zh-Hant.podcasts.overlay.json       (Vietnamese cues)
```

The script runs when the owner invokes it. It is not part of `nest start` or of the web
build. The seed and overlay files it writes are the canonical source; the script does not
need to be re-run in CI, in the deploy, or on every boot.

## Ingest script

Location: `apps/api/src/ingest/podcasts-from-folder.ts`. Invoked as:

```bash
npx tsx apps/api/src/ingest/podcasts-from-folder.ts \
  --source /Users/lemo/code/repo/playground/podcastdiscovery/transcripts \
  --out apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json \
  --overlay-en apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.overlay.json \
  --overlay-vi apps/api/src/catalog/data/catalog.vi-zh-Hant.podcasts.overlay.json
```

Shape:

1. **Walk** `<source>/*/*/` — every second-level folder is an episode candidate.
2. **Skip** any folder without `metadata.json`.
3. **Read `transcript.json` for every episode** (files were unified in place by the owner; there is no `.trad.` sibling). Assert two things per file, or the script exits:
   - `language` in the ElevenLabs output is `zho`.
   - No character in the cue text falls in a hardcoded set of Simplified-only characters (e.g. 说, 这, 时, 会, 学, 国, 语, 视, 频, 车, 门, 电, 见, 觉, 语, 边, 边, 长). This is a conservative check — a native-Traditional file has zero of these; a Simplified file has many; a well-converted file has zero. The check does not attempt to *validate* the conversion (that would require the round-trip ADR 0006 forbids); it only catches the case where a Simplified file was not converted at all.
4. **Build `Show` records** by grouping folders on their parent directory. The script carries a hand-maintained mapping table (in the script), keyed by folder name, that gives each show its `showId` (Latinised slug) *and* records whether it is native-Traditional or `scriptConversion: "manual"`. The table is short — six entries — and reviewed as part of this design. Ingesting a folder whose parent is not in the table is a hard error.
5. **Compute per episode**: `cpm` from word timings per ADR 0013, `duration` from `audio_duration_seconds`, `speakerCount` from distinct `speaker_*` labels.
6. **Read per episode** (authored during ingest, into the script's episode table): `level` (Beginner / Intermediate / Advanced), `tocfl` (Novice 1 → Advanced High), `topic`, `tags`, and `levelReason` + `learningGoal` in **both English and Vietnamese**. Vietnamese values marked `authoredBy: "auto-translated"`. See *Rating methodology*.
7. **Emit the seed record** with the shape existing seeds use, adding the new fields: `tocfl`, `scriptConversion` (present only when non-native), `redistributable`, `overlayVerified`, `ratedBy`, `audioUrl` (remote), `authoredBy` (per-language). All `Localized` fields carry both `en` and `vi` keys. `cefr` is not written for these episodes — the field stays optional and the ADR that adds TOCFL will explain why.
8. **Emit both overlays**: parse `bilingual.en.srt` and `bilingual.vi.srt`, key each cue by `MM:SS` of `Math.round(startMs/1000)`. This is the same rule the existing overlays follow (HANDOFF 2026-09-05, "the overlay is keyed by rounded seconds, not by the seed's `time` string"). Test that no two cues in an episode round to the same second — that would be a silent overwrite. Test that both overlays cover the same set of timestamps — a divergence is a data bug worth failing the ingest for.

The script is one file, ~300–400 lines. No new npm dependencies beyond `tsx` (already dev dep) and a Traditional-detection helper (character range check + a probe against a small Simplified-only character list; no round-trip conversion). It does not use OpenCC.

## Rating methodology (transcript-only)

Every `level`, `tocfl`, `levelReason`, `learningGoal` written into the seed is derived
from text and timings alone. What the owner reads on the card is a rating I made without
hearing the audio. This is called out in three places:

- Every episode carries `ratedBy: "transcript-only"` in the seed.
- The UI shows a small "transcript-only rating" affordance next to the level pill on the
  discovery card, and again on the episode page. Wording deferred to the UI slice.
- The ADR that introduces TOCFL declares this — that a rating derived from a machine
  transcript is *not* a rating a language teacher would sign.

Signals used:

- **Speech rate** (`cpm`, per ADR 0013): the primary speed input.
- **Pause structure**: distribution of inter-cue gaps ≥ 500 ms. A 30-second-median-gap
  episode is easier than a 200-ms one at the same `cpm`.
- **Speaker structure**: monologue vs 2-speaker interview vs multi-speaker panel. Two
  speakers who take turns give a learner recovery moments; a panel that talks over each
  other does not.
- **Lexical difficulty**: character frequency against a TOCFL character list, computed
  from the transcript. Percentage of characters above each TOCFL band.
- **Topic**: from title and description. A cooking episode is easier than a legal one at
  the same measured difficulty because the concepts are already known.

The `levelReason` sentence follows the pattern the existing episodes use — one clause
naming the *why* (pauses, vocabulary, topic, speaker structure), one clause anchoring it
to numbers. No sentence copies the rendered speed back into itself (the redundancy bug
episode 101/102 walked into; see HANDOFF).

## The two originally-Simplified shows

TeaTime-Chinese and Learning-Chinese-through-Stories were Mainland Simplified in the
source folder. The owner has already converted them to Traditional **in place** —
`transcript.json` and `transcript.srt` for those two shows now hold Traditional characters
directly, with no separate `.trad.` file. The ingest script does not do the conversion,
does not re-verify it, and cannot tell native from converted by reading the file.

The distinction is preserved through a **hardcoded show-mapping table** in the ingest
script itself, which records for each of the six folders both its `showId` and its
provenance. That table is the audit trail — not the file contents, and not a marker
in the filesystem.

The seed carries the fact through `scriptConversion`:

- `scriptConversion` absent: native-Traditional source, one of the four Taiwan shows.
- `scriptConversion: "manual"`: converted by the owner outside the ingest.

There is deliberately no `"opencc"` value. The distinction the reader cares about is
whether a human took responsibility for the fidelity, not which tool ran.

## English overlay

`bilingual.en.srt` is ElevenLabs' auto-translation cued to the same timings. Its per-cue
alignment is trustworthy; its wording is not verified against the Chinese it claims to
translate. The seed's per-episode `overlayVerified: false` captures this, and the UI must
render a per-cue or per-episode label to that effect ("auto-translated").

An overlay marked `overlayVerified: false` is still shown by default. The alternative —
hiding it — would strand a learner without the crutch a real translation would give, in
service of a caution the label already satisfies. The rule is *state the reason*, not
*withhold the material*.

## What this changes in the API

Language types (`catalog/language.types.ts`): add `'vi'` to the `LANGUAGES` tuple. This
propagates through `LanguageTag` and `Localized<T>`; any exhaustive switch that breaks is
the point — TypeScript is the audit. Expect ~5–10 places to update, all mechanical.

Seed loader (`catalog.seed.ts`): add `catalog.en-zh-Hant.podcasts.seed.json` to
`SEED_FILES`. No other loader change; the new seed obeys the existing schema plus
optional fields.

Episode type (`catalog.types.ts`): add optional fields — `tocfl`, `scriptConversion`,
`ratedBy`, `authoredBy`, `overlayVerified`, `redistributable`, `audioUrl`. Existing
episodes are unaffected because the fields are optional.

Overlay loader (`catalog.overlay.ts`): consume the two new overlay files for episodes in
the 200–299 range, one per learner language. Existing overlays keep working; the loader
is a merge.

Ranking (`catalog.service.ts`): TOCFL band is *not* wired into ranking in this slice.
Ranking still uses `level` (Beginner/Intermediate/Advanced) for the coarse filter, and
`cpm` and pauses for the fine ordering. Wiring TOCFL is a separate design.

Route validators (`apps/web/app/[speaks]/[learning]/...`): the `[speaks]` param
validator accepts `vi` after step 1's `LANGUAGES` change. `listPairs` in `catalog.service`
already derives shipped pairs from content availability (per HANDOFF 2026-09-05), so
`vi → zh-Hant` shows up once the seed has Vietnamese-keyed copy for at least one episode
in that direction.

No changes to persistence: this is catalogue data, and per ADR 0011 the seed is still the
single source. A boot will republish the new episodes into Postgres like it does every
other seed change.

## What this changes in the web app

Four visible changes, all small, all called out here because the seed fields they surface
are useless without them:

- **"Transcript-only rating" affordance** on the discovery card and the episode page,
  wherever the level pill is shown. Wording deferred to the UI slice.
- **"Auto-translated" label** on English overlay cues from episodes whose
  `overlayVerified` is `false`.
- **The vocabulary tab hides** on episodes with `vocabulary: []`. It does not render as
  "0 words" — an empty tab is a claim the episode teaches nothing, which is not what
  `vocabulary: []` means. The absence of authored vocabulary is a data shape, not a
  pedagogy signal.
- **The discovery card's `newWords` line hides** on the same episodes for the same
  reason. `newWords` is currently derived from `vocabulary.length`; the derivation stays,
  the card branches on `> 0`.

The player is *not* rebuilt for long transcripts in this slice. A 40-minute episode with
600 cues will render but scroll poorly. See *Downstream work this defers*.

## What this changes in the seed shape

New optional fields on `Episode`:

```ts
tocfl?: TocflBand;             // "Novice 1" | … | "Advanced High"
scriptConversion?: "manual";   // absent = native
ratedBy?: "transcript-only";   // absent = a human rated with audio
overlayVerified?: boolean;     // per-episode; overlays without this default to unverified
redistributable?: boolean;     // default false; ingested episodes explicitly set true
audioUrl?: string;             // remote; used when audioSrc is absent
sourceUrl?: string;            // already exists; per-episode value from metadata.page_url
```

The existing `cefr` field stays. It is not written for these episodes and the UI branches
on presence — TOCFL first, CEFR second, neither third.

## ADRs to write

Alongside this design:

1. **TOCFL for Mandarin proficiency labels.** Closes ADR 0003 decision 7. Explains why
   CEFR is the wrong framework for Traditional-Mandarin catalogue and why HSK is the
   wrong framework for Taiwan speakers.
2. **Full-episode ingestion, remote audio.** Records the shift from 90-second excerpts
   with committed audio to 30-minute episodes with remote URLs. Names what has to be
   built next (player virtualisation, resume-from-position) as *known deferred work*, not
   *bugs*.
3. **Authored vocabulary is a lesson artifact; ingested episodes ship without it.** Says
   what replaces `Episode.vocabulary[]` in the UX (nothing yet; dictionary tap-to-lookup
   is a separate slice), and why templating fake vocabulary would fabricate a ranking
   signal (same class as the completion-by-level rule).
4. **English overlay from machine translation, marked as such.** Records the
   `overlayVerified: false` convention and the UI's obligation to surface it.

## Downstream work this defers

Named on purpose so the ingest is not blamed for what it deliberately did not do.

- **Dictionary tap-to-lookup.** CC-CEDICT via a NestJS `/api/dict/lookup` endpoint,
  segmentation via jieba, tap-a-word popup with "Save" wired to the existing
  saved-words store. Its own design.
- **Player rework for long transcripts.** Virtualised cue list, scroll-lock-to-current,
  resume-from-position (needs a durable per-learner store on top of the existing
  Postgres). Its own design.
- **TOCFL as a ranking input.** This slice writes the field; the ranker ignores it.
  Wiring is a separate design.
- **RSS ingestion.** The general path VISION describes and `apps/api/src/ingest/README.md`
  is scoped to. This design is folder-based, one-shot; RSS is a different problem.

## Verification

Local, before merge:

```bash
npx tsx apps/api/src/ingest/podcasts-from-folder.ts \
  --source /Users/lemo/code/repo/playground/podcastdiscovery/transcripts \
  --out apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.seed.json \
  --overlay apps/api/src/catalog/data/catalog.en-zh-Hant.podcasts.overlay.json

npm run lint && npm run typecheck && npm run build
npm test    # existing suite still passes; new suite covers the ingest script
STATIC_EXPORT=1 npm run build --workspace @discopod/web
node apps/api/dist/main.js &
curl -s localhost:3001/api/episodes?learning=zh-Hant | jq 'length'   # expect >= 24 more
curl -s localhost:3001/api/episodes/200 | jq '.tocfl, .ratedBy, .overlayVerified'
```

Then open `/en/zh-Hant` in a browser and confirm:

- The new episodes appear on discovery with TOCFL pills and a "transcript-only rating" marker.
- The card shows no `newWords` line and opening the episode shows no vocabulary tab.
- Opening one shows the full transcript, the audio plays from the remote URL, and the
  English overlay cues render with the "auto-translated" label.
- The existing episodes (7, 102, 103, 104, VOA lessons) still render unchanged — level
  pills, vocabulary tabs, `newWords` lines all present, no "transcript-only" marker.

CI: no new gates. The existing `npm test` and static-export check are sufficient. The
smoke test that counts episodes shipped with ADR 0011 will report a larger number; that
is the change and that is the assertion.

## Not verified in this design

- **The 24 episodes have not been read yet.** Their `level`, `tocfl`, `levelReason`, and
  `learningGoal` are outputs of the ingest work, not inputs to this design. The rating
  methodology above is the process; the actual values land in the seed.
- **The 2 originally-Simplified shows' conversions have not been spot-checked** in this
  session. The owner converted them and owns the fidelity claim; the ingest script does
  not re-verify. Any later error in the converted characters is a data bug in the source
  folder, not a design gap here.
- **Remote `audio_url` stability has not been probed.** Libsyn URLs *look* stable but
  some carry `dest-id=…` tokens. If one 404s after ingest, that is a re-fetch, not a
  design bug.
