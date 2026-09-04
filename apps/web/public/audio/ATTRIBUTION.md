# Audio attribution

Every file in this directory is somebody else's recording. This is the record of whose,
under what licence, and what was done to it. It travels with the files rather than living
in `docs/` so that copying the directory cannot separate the audio from its terms.

---

## `haishan-lead.mp3` / `haishan-lead.vtt` — 海山漁港（條目導言）

An excerpt of a volunteer reading of the Chinese Wikipedia article **海山漁港** (Haishan
Fishing Port, Hsinchu, Taiwan), recorded for Wikipedia's spoken-articles project.

| | |
| --- | --- |
| **Speaker** | Yuriy kosygin, who is also the article's author |
| **Source recording** | [`File:Zh-海山漁港.ogg`](https://commons.wikimedia.org/wiki/File:Zh-%E6%B5%B7%E5%B1%B1%E6%BC%81%E6%B8%AF.ogg) on Wikimedia Commons, uploaded 2014-07-23 01:15:57 UTC |
| **Source text** | [zh.wikipedia.org 海山漁港, revision 31977329](https://zh.wikipedia.org/w/index.php?title=%E6%B5%B7%E5%B1%B1%E6%BC%81%E6%B8%AF&oldid=31977329) (2014-07-22) |
| **Licence** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0), stated on the Commons file page as `{{self|cc-by-sa-4.0}}` and applying to the underlying article text as well |
| **sha1 of the source .ogg** | `271b619de8e67ab5464dc195c6f98d19b0ef8d5b` (verified against the Commons API on download) |
| **sha256 of the source .ogg** | `b083a0551cf32897d847d7ce0999efaad3784afc2ff5561bedd993d42c364386` |

### Why this recording and not another spoken article

Chinese Wikipedia's spoken-article corpus is not a Traditional Chinese source. A survey of it
found the underlying wikitext is overwhelmingly **Simplified-authored**, including for files
whose Commons name carries the `Zh-tw-` prefix — that prefix records the *narrator's accent*,
not the script of the text. Anyone reaching for this corpus again should assume Simplified and
check, rather than trust the filename.

海山漁港 is the exception this project found, and the evidence that it is Traditional as
authored rather than machine-converted is in the wikitext itself:

- Only Traditional forms appear throughout — 中華民國, 臺灣, 漁港, 辦理, 興建, 斥資.
- There is **no `{{NoteTA}}`** conversion configuration, i.e. nothing in the article needed
  converting for any reader.
- The address is written `海山-{里}-`. The `-{ }-` markup *suppresses* automatic conversion,
  and it is there to stop 里 being turned into 裡. That is a Traditional-writing author
  defending a specific character, which a converted article would have no reason to carry.
- Its sources are Taiwanese government pages (行政院農業委員會漁業署, 新竹市政府).

### Which revision was read

The article carries `{{Spoken Wikipedia|Zh-海山漁港.ogg|2014年|7月23日|語音}}` and the reader
says at 00:20 of the recording *"錄製時間為西元2014年7月23日星期三"*. The Commons upload
timestamp is 2014-07-23 01:15:57 UTC. **31977329** is the revision current on that date — the
last edit before the recording — and is what is cited above.

### What was changed

This is a derivative work. Under BY-SA the modifications have to be stated:

1. **Excerpted.** 00:39.90–02:03.40 of the source, which is the article's lead section. The
   reader's spoken preamble (the source, the URL, the recording date), the coordinates he
   reads out of the infobox, and everything from the first section heading (沿革) onward are
   not included.
2. **Transcoded.** Ogg Vorbis 44.1 kHz mono → MP3 64 kbps 44.1 kHz mono, for browsers that
   do not play Ogg.
3. **Loudness normalised** to −16 LUFS, linear, landing at −16.5 LUFS / −4.25 dBTP. Note the
   direction: the source is **−11.79 LUFS**, louder than the target, so this turns it *down*.
4. **Timed transcript added** (`haishan-lead.vtt`, and the cues in
   `apps/api/src/catalog/data/catalog.en-zh-Hant.seed.json`). No timed transcript was
   published with the recording; this one was built here — see below.

### How the transcript was made

The words come from the Wikipedia revision above. The timings come from `mlx-whisper`
(large-v3-turbo) run on the source. This division is not a convenience: **the ASR decodes
Mandarin into Simplified**, so using its output as text would have silently undone the one
property this episode was chosen for. The published wikitext is the only source of characters
here, and nothing is converted between scripts — ADR 0006.

Three places where the reader and the published text disagree, and what was done about each:

| Text | ASR | Shipped | Why |
| --- | --- | --- | --- |
| 東北至新竹市區**約**8公里 | 東北至新竹市區八公里 | without 約 | A clean 3.8 s slice decodes at avg_logprob **−0.097**, the best in the passage, and the full-file decode agrees. He omitted it. |
| 、鯊魚類為主 | **以及**鯊魚類**等**為主 | with 以及 … 等 | Two independent decodes return it. He added it. |
| **北距**新竹漁港11.5公里 | 北**至**新竹漁港11.5公里 | **北距**, as published | Three decodes say 北至, but the same segment also renders 漁港 as 渔感, so its confidence is not usable. A 2.3 s window meant to settle it returned a Whisper hallucination (a Chinese TV-subtitle watermark) instead. Unresolved, so the published text stands and the disagreement is recorded rather than decided. |

That last row is why the episode is seeded `verifiedLesson: false`: Wikipedia published the
text, nobody published a timed transcript of this recording, and one cue is not established.

### The speech rate

`≈ 144 cpm`, measured rather than estimated: 197 Han characters over 82.06 s of speech
(40.38 → 122.44 in the source). Digits are not counted, so the spoken length of "11.5公里" is
undercounted — the same convention as every other `cpm` in the catalogue, kept for
comparability rather than for accuracy about this one line.

The delivery is slower than that number suggests, because a third of it is silence: at a
−40 dB threshold the shipped excerpt holds **35 pauses totalling 28.11 s, 34% of its 83.5 s**.
The noise floor is genuinely low — a measured pause reads −63.3 dB mean against −11.7 dB for
speech — so those are real gaps, not a threshold artefact.

---

## `voa-lesson-1-welcome.mp3` / `voa-lesson-1-welcome.vtt` — Let's Learn English, Lesson 1

| | |
| --- | --- |
| **Publisher** | VOA Learning English |
| **Source** | <https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html> |
| **Status** | Voice of America material is a work of the US federal government and in the public domain in the United States. |

This predates the file and is recorded here for completeness rather than from the same
research; the VOA terms should be re-read before this app is deployed publicly.
