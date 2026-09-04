# Audio attribution

Every file in this directory is somebody else's recording. This is the record of whose,
under what licence, and what was done to it. It travels with the files rather than living
in `docs/` so that copying the directory cannot separate the audio from its terms.

---

## `dayanta-lead.mp3` / `dayanta-lead.vtt` — 大雁塔（条目导言）

An excerpt of a volunteer reading of the Chinese Wikipedia article **大雁塔** (Giant Wild
Goose Pagoda), recorded for Wikipedia's spoken-articles project.

| | |
| --- | --- |
| **Speaker** | Yu chuan |
| **Source recording** | [`File:Zh-tw-大雁塔.ogg`](https://commons.wikimedia.org/wiki/File:Zh-tw-%E5%A4%A7%E9%9B%81%E5%A1%94.ogg) on Wikimedia Commons, uploaded 2015-11-30 |
| **Source text** | [zh.wikipedia.org 大雁塔, revision 36492554](https://zh.wikipedia.org/w/index.php?title=%E5%A4%A7%E9%9B%81%E5%A1%94&oldid=36492554) (2015-07-24) |
| **Licence** | CC BY-SA — see the discrepancy below |
| **sha256 of the source .ogg** | `72d5c2d6f829a2cfc822a66a09aa2f0432d09a5a2ab21e92fe047cb250f2a4b7` |

### Which revision was read

Two claims about this exist and they disagree, so both are recorded.

- The Commons file page says the spoken text is **oldid 38160572**.
- The reader says aloud, at 00:30 of the recording, *"此录音根据2015年7月24日版本录制"* —
  recorded from the **2015-07-24** version.

The revision history settles it. 38160572 is dated **2015-11-30** and its author is Yu chuan
himself; its parent, 36492554, is dated **2015-07-24T16:29:11Z**, exactly the date spoken.
The two revisions differ by one line — the `{{Spoken Wikipedia}}` template Yu chuan added
after recording — and the prose is byte-identical.

So the file page's link is off by one edit, that edit is the reader's own, and it changes no
word he read. **36492554 is cited above as the text**, because it is the one the reader named
and the one that existed when he read it. Nothing turns on the choice; it is written down so
that nobody has to re-derive it.

### The licence discrepancy

The Commons file page carries `{{self|cc-by-sa-4.0}}` — **CC BY-SA 4.0**.

At 15:48 the reader states a different one aloud: *"这个语音档案及所有的文字内容，都是在
创用CC署名—相同方式共享 3.0 协定下发行的"* — **CC BY-SA 3.0**.

Both are BY-SA, so the obligations that matter here (credit the author, name the licence,
share derivatives alike) are the same either way, and 4.0 is the later and more permissive of
the two. This project relies on the **file page's 4.0**, which is the uploader's own written
declaration on the work itself, and notes the spoken 3.0 because a licence stated two ways is
a fact about the source, not a detail to tidy away.

### What was changed

This is a derivative work. Under BY-SA the modifications have to be stated:

1. **Excerpted.** 00:42.00–02:25.20 of the source, which is the article's lead section. The
   reader's spoken preamble (his name, the version date) and everything from the first
   section heading onward are not included.
2. **Transcoded.** Ogg Vorbis 44.1 kHz mono → MP3 64 kbps 44.1 kHz mono, for browsers that
   do not play Ogg.
3. **Loudness normalised** to −16 LUFS. The source averages −25.1 dB.
4. **Timed transcript added** (`dayanta-lead.vtt`, and the cues in
   `apps/api/src/catalog/data/catalog.zh-Hans.seed.json`). No timed transcript was published
   with the recording; this one was built here — see below.

### How the transcript was made

The words come from the Wikipedia revision above. The timings come from `mlx-whisper`
(large-v3-turbo) run on the excerpt that ships. Neither alone would be enough, and each
caught the other's errors:

- The published text corrected the ASR's homophones: it heard 大**祠**恩寺 for 大**慈**恩寺,
  永**辉** for 永**徽**, 市**辉** for 市**徽**, 玄**帐** for 玄**奘**.
- The ASR caught the reader departing from the published text once. At 00:43 he says
  **而遭多次毁损**; the article reads 而多次遭到损毁. Three independent decodes — the full
  file, an 8-second slice, and the shipped excerpt — all return that word order, and the
  segment's confidence is unremarkable (avg_logprob −0.125, against −0.158 across the
  passage). The cue carries **what he said**, because it is a transcript of the audio.

This is why the episode is seeded `verifiedLesson: false`: Wikipedia published the text, but
nobody published a timed transcript of this recording, and one cue departs from the text on
purpose.

### The speech rate

`≈ 140 cpm`, and it is measured rather than estimated: 240 Han characters over 102.47 s of
speech (42.31 → 144.78 in the source). At a −40 dB threshold the passage is 21% silence
across 36 pauses, which is what a rate that low is made of — this is deliberate read-aloud,
not fast speech.

---

## `voa-lesson-1-welcome.mp3` / `voa-lesson-1-welcome.vtt` — Let's Learn English, Lesson 1

| | |
| --- | --- |
| **Publisher** | VOA Learning English |
| **Source** | <https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html> |
| **Status** | Voice of America material is a work of the US federal government and in the public domain in the United States. |

This predates the file and is recorded here for completeness rather than from the same
research; the VOA terms should be re-read before this app is deployed publicly.
