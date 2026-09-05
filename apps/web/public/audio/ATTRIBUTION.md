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

`≈ 143 cpm`, measured rather than estimated: 197 Han characters over the shipped file's
82.56 s speech span. Digits are not counted, so the spoken length of "11.5公里" is
undercounted — the same convention as every other `cpm` in the catalogue, kept for
comparability rather than for accuracy about this one line. (This read 144 cpm until the
denominator was pinned down in ADR 0013; it was measured against the source's speech span
rather than the shipped file's.)

The delivery is slower than that number suggests, because a third of it is silence: at a
−40 dB threshold with a 0.3 s minimum, the shipped excerpt holds **33 pauses totalling
27.55 s, 33% of its 83.5 s**.
The noise floor is genuinely low — a measured pause reads −63.3 dB mean against −11.7 dB for
speech — so those are real gaps, not a threshold artefact.

---

## `deng-furu-lead.mp3` / `deng-furu-lead.vtt` — 鄧福如（條目導言）

An excerpt of a volunteer reading of the Chinese Wikipedia article **鄧福如** (A-Fu, a
Taiwanese singer-songwriter), recorded for Wikipedia's spoken-articles project.

| | |
| --- | --- |
| **Reader / uploader** | Prima Lin. The Commons page credits the file as `Own work` by that account and names nobody else; unlike the 吳宗憲 file below it has no separate `Speaker:` field, so the reader is identified only as the uploader. |
| **Source recording** | [`File:Zh-tw-鄧福如.ogg`](https://commons.wikimedia.org/wiki/File:Zh-tw-%E9%84%A7%E7%A6%8F%E5%A6%82.ogg) on Wikimedia Commons, uploaded 2016-01-16 11:22:59 UTC — Ogg Vorbis, 44.1 kHz mono, 18:33, 10 823 456 bytes |
| **Source text** | [zh.wikipedia.org 鄧福如, revision 38683550](https://zh.wikipedia.org/w/index.php?title=%E9%84%A7%E7%A6%8F%E5%A6%82&oldid=38683550) (2016-01-07) |
| **Licence** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0), stated on the Commons file page, and applying to the underlying article text as well |
| **sha1 of the source .ogg** | `92564a40a39f6d024259210b2cab3341cc47b321` (verified against the Commons API after download) |
| **sha256 of the source .ogg** | `7696dfdacfac80ee47875a0cf84a0beb57288182a23eaf3e9e0fb8d218007441` |
| **sha256 of the shipped .mp3** | `fb7f7da8c6440fc94154ce6f07243ac0176079c046beb3bb5e8661f89070aac2` |

### Why this recording

Same test as 海山漁港, and the same warning applies: the `Zh-tw-` prefix on a Commons
filename records the narrator's accent, not the script of the article. The evidence that
this article is Traditional **as authored** is in the wikitext:

- Only Traditional forms throughout — 樂團, 專輯, 電子音樂, 點擊率, 金曲獎.
- **No `{{NoteTA}}`** conversion configuration, so nothing in it needed converting for
  any reader.
- Its subject, its label (豐華唱片) and its sources are Taiwanese.

One caveat worth writing down, because it cost time: a "does it contain Simplified-only
characters" probe is a bad test on its own. It flags 台, which is a standard Taiwan
Traditional variant of 臺 and appears in Traditional-authored articles constantly. The
absence of `{{NoteTA}}` plus the forms above is the evidence; a character-set probe is not.

### Which revision was read

The Commons page does not cite a revision, so it was derived: **38683550** is the revision
current when the file was uploaded (2016-01-07, the last edit before 2016-01-16). The
reading matches it — including the article's own missing 以 in the 節奏藍調 sentence, which
the reader audibly repairs (see the deviation table).

### What was changed

This is a derivative work. Under BY-SA the modifications have to be stated:

1. **Excerpted.** 00:36.90–01:48.20 of the source, which is the article's lead section
   exactly. The reader's spoken preamble and everything from the first section heading
   (音樂生涯) onward are not included. The cut also deliberately excludes the reader's spoken
   section number (「第一節」), which is not in the published text and therefore, under
   [ADR 0010](../../../../docs/adr/0010-the-chinese-discopod-teaches-is-traditional.md),
   could not be transcribed from it.
2. **Transcoded.** Ogg Vorbis 44.1 kHz mono → MP3 64 kbps 44.1 kHz mono, for browsers that
   do not play Ogg.
3. **Loudness normalised** to −16 LUFS, landing at −16.4 LUFS / −0.7 dBFS sample peak.
   **Dynamic, not linear** — and that is a real difference from `haishan-lead.mp3`, which was
   normalised linearly. The source excerpt measures `input_i −25.60 LUFS`, `input_tp −7.56
   dBTP`: reaching −16 needs +9.6 dB and there is only 7.6 dB of headroom, so a linear gain
   would clip by ~2 dB. 海山漁港 had the opposite problem — it was *louder* than target, so
   linear was free. Dynamic normalisation alters the internal level relationships of the
   recording, which is exactly why it is listed here rather than filed under "transcoding".
4. **Timed transcript added** (`deng-furu-lead.vtt`, and the cues in
   `apps/api/src/catalog/data/catalog.en-zh-Hant.seed.json`). None was published with the
   recording.

### How the transcript was made

The characters come from the Wikipedia revision above; the timings come from `mlx-whisper`
(large-v3-turbo). Never the other way round: **the ASR decodes Mandarin into Simplified**, so
its output cannot be the source of text in a catalogue whose point is Traditional. Nothing is
converted between scripts — ADR 0006.

Where the reader and the published text disagree:

| Published text | What the reader says | Shipped | Why |
| --- | --- | --- | --- |
| 鄧福如（阿福，英語：A-FÜ，1987年6月20日—） | 鄧福如，出生於1987年6月20日 | the reader's | The parenthetical is infobox notation, not a sentence. She speaks it as one and drops the alias and the English name; there is no way to transcribe what is on the page against what is in the audio. |
| 演唱的歌曲節奏藍調及輕電子音樂為主 | 演唱的歌曲**多為**節奏藍調及輕電子音樂 | the reader's | The published sentence is missing its 以 — 「以…為主」 with no 以. It is a typo in the article, and she reads a grammatical sentence instead. Two independent decodes return 多為. |

And one place where the ASR is wrong and the published text stands: it renders 擁有**清亮**嗓音
as 拥有7辆嗓音. The text is not in doubt there; only the timing came from that segment.

Because a timed transcript of this recording is not published anywhere, the episode is seeded
`verifiedLesson: false`.

### The speech rate

`≈ 172 cpm`, measured: **204 Han characters over the 71.30 s excerpt**. Digits are not
counted, so 1987年6月20日 and 第23屆 are undercounted — the same convention as every other
`cpm` here, kept for comparability.

It is nearly unbroken. At a −40 dB threshold there are **3 pauses totalling 1.15 s, 1.6% of
the file**, against 34% for 海山漁港. That number needs a caveat, though, and it is the
caveat that matters more than the number: this recording has an audible room floor. A
measured pause reads −40.19 dB RMS with a −20.78 dB peak, where a 海山漁港 pause reads
−63.3 dB. So the pause count here is partly a threshold artefact — at −30 dB the same file
gives **7 pauses totalling 4.69 s**. Either way it is the least room to think in the
catalogue, which is why it is seeded Advanced.

---

## `wu-zongxian-life.mp3` / `wu-zongxian-life.vtt` — 吳宗憲（音樂家）－生平

An excerpt of a volunteer reading of the Chinese Wikipedia article **吳宗憲 (音樂家)** — the
Chinese-flute player and composer, not the television host of the same name.

| | |
| --- | --- |
| **Speaker** | User:S099001, named in the Commons `Artist` field as `Speaker:` and crediting the recording as their own |
| **Source recording** | [`File:Zh-吳宗憲 (音樂家)-article.ogg`](https://commons.wikimedia.org/wiki/File:Zh-%E5%90%B3%E5%AE%97%E6%86%B2_(%E9%9F%B3%E6%A8%82%E5%AE%B6)-article.ogg) on Wikimedia Commons, uploaded 2018-02-02 13:23:22 UTC — Ogg Vorbis, 48 kHz stereo, 2:23, 1 482 471 bytes |
| **Source text** | [zh.wikipedia.org 吳宗憲 (音樂家), revision 48124446](https://zh.wikipedia.org/w/index.php?title=%E5%90%B3%E5%AE%97%E6%86%B2_(%E9%9F%B3%E6%A8%82%E5%AE%B6)&oldid=48124446) (2018-02-02 13:08:37 UTC) |
| **Licence** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0), stated on the Commons file page, and applying to the underlying article text as well |
| **sha1 of the source .ogg** | `c4353bc1124e8c195a98417d06cfcd1044ff8d2e` (verified against the Commons API after download) |
| **sha256 of the source .ogg** | `bb861799cf528f4ec8a9727d01c9f78d04a89dd439f0369c43781575ffd76b60` |
| **sha256 of the shipped .mp3** | `45f2b29158d1c7c507dbecd6f8f0a40eedd8b933579e668f5133c0b99b6a3c27` |

### Which revision was read

Nothing had to be inferred here: the Commons file page **cites the revision itself** —
`oldid=48124446`, timestamped 2018-02-02 13:08:37 UTC, fifteen minutes before the upload and
made by the same account that recorded it. This is what the 海山漁港 and 鄧福如 entries had
to reconstruct from dates, and it is the reason this file was worth preferring.

The article is Traditional as authored: no `{{NoteTA}}`, Traditional forms throughout
(國樂, 絲竹, 總統府, 傑出), and Taiwanese institutional sources.

### What was changed

1. **Excerpted.** 00:52.80–02:07.40 of the source, which is the `== 生平 ==` section exactly.
   The spoken preamble, the lead, and the reference list are not included, and the cut
   excludes the reader's spoken section number (「第一點一節」), which is not in the published
   text.
2. **Transcoded.** Ogg Vorbis 48 kHz **stereo** → MP3 64 kbps 44.1 kHz **mono**. This one is
   downmixed as well as re-encoded; 鄧福如 and 海山漁港 were already mono.
3. **Loudness normalised** to −16 LUFS, landing at −16.5 LUFS / −1.1 dBFS sample peak.
   **Dynamic, not linear**, for the same reason as 鄧福如: `input_i −19.83 LUFS`, `input_tp
   −2.84 dBTP` — +4.2 dB of gain wanted against 2.8 dB of headroom.
4. **Timed transcript added** (`wu-zongxian-life.vtt`, and the cues in the seed).

### How the transcript was made

As above: characters from the cited revision, timings from `mlx-whisper` (large-v3-turbo).

One reader-versus-text disagreement:

| Published text | What the reader says | Shipped | Why |
| --- | --- | --- | --- |
| 資深青商總會主辦**之的**「十大傑出青年薪傳獎」 | 主辦**的** | the reader's | 之的 is a typo in the article — two particles where one belongs. He reads the sentence as it was meant. |

The ASR also renders 薪傳獎 as 新传奖 and 采風樂坊 inconsistently; the published text stands in
both cases, and only the timings came from those segments. Seeded `verifiedLesson: false`
for the same reason as the other two: nobody published a timed transcript of this recording.

### The speech rate

`≈ 173 cpm`, measured: **215 Han characters over the 74.60 s excerpt**, digits not counted —
which undercounts this passage more than most, since it is a list of years (1961, 1983, 1991,
1995, 2006, 1994).

This reader leaves room where 鄧福如 does not: **14 pauses totalling 8.75 s at −40 dB, 11.7%
of the file**, and they fall on the semicolons and between sentences. It is seeded Advanced
anyway, on vocabulary rather than speed: 文建會, 介壽館, 資深青商總會, 十大傑出青年薪傳獎 arrive
with no explanation, and each is a Taiwanese institution whose name gives away nothing about
what it is.

---

## VOA Learning English — *Let's Learn English*, Lessons 1, 2, 4, 5, 6 and 10

| | |
| --- | --- |
| **Publisher** | VOA Learning English |
| **Series** | <https://learningenglish.voanews.com/z/3608> |
| **Status** | Voice of America material is a work of the U.S. federal government and in the public domain in the United States. |
| **What was changed** | **Nothing.** Each file is the publisher's own MP3, byte for byte. |

Every one of these is VOA's 64 kbps 44.1 kHz stereo download, saved unmodified — no excerpt,
no transcode, no loudness normalisation. Confirmed by `content-length` on the source URL
matching the shipped file's size exactly. There is no modification list for these because
there are no modifications; only the transcripts were added here.

| File | Lesson | Lesson page | Audio | Bytes | sha256 |
| --- | --- | --- | --- | --- | --- |
| `voa-lesson-1-welcome.mp3` | 1 — Welcome! | [3111026](https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html) | — | 236 944 | `f9bd90edddbb8736f64fb5cb3a34ab5a27aecd6e99510977e7b820caf47c5cf7` |
| `voa-lesson-2-hello.mp3` | 2 — Hello, I'm Anna! | [3113733](https://learningenglish.voanews.com/a/lets-learn-english-lesson-2-hello/3113733.html) | [`56246d7b…`](https://voa-audio.voanews.eu/vle/2016/02/10/56246d7b-5fa4-42d2-90b0-d403e6b46227.mp3) | 384 603 | `e943ca83c8a0d33bb3e505ba61cfda86c31f821bd065feb414aa83788faed2db` |
| `voa-lesson-4-what-is-it.mp3` | 4 — What Is It? | [3168920](https://learningenglish.voanews.com/a/lets-learn-english-lesson-4/3168920.html) | [`af0324f6…`](https://voa-audio.voanews.eu/vle/2016/02/26/af0324f6-67c5-4c0c-ab42-abb0cd33817c.mp3) | 714 643 | `a648e8181a2ef6b1fd106f0de0bc05f7bd09f99d66f2f8f380d78afe353c27c4` |
| `voa-lesson-5-where-are-you.mp3` | 5 — Where Are You? | [3168971](https://learningenglish.voanews.com/a/lets-learn-english-lesson-5-where-are-you/3168971.html) | [`ab9c2944…`](https://voa-audio.voanews.eu/vle/2016/03/01/ab9c2944-eddc-4806-9296-290bfa8c6ff2.mp3) | 485 503 | `d0a785ada7babff5d4a8e126dd2ee7aaeab8d1ae58d996c97abd2033d6202f61` |
| `voa-lesson-6-where-is-the-gym.mp3` | 6 — Where Is the Gym? | [3225958](https://learningenglish.voanews.com/a/lets-learn-english-lesson-6-where-is-the-gym/3225958.html) | [`66b63229…`](https://voa-audio.voanews.eu/vle/2016/03/10/66b63229-1dc5-40ab-886d-1f4b891adf6b.mp3) | 864 592 | `a2ea933905fe40a710160ac8d8b128631b8736c9b61dbd96cbc348c7d5a09cf5` |
| `voa-lesson-10-come-over.mp3` | 10 — Come Over to My Place | [3285228](https://learningenglish.voanews.com/a/lets-learn-english-lesson-10/3285228.html) | [`442a6a50…`](https://voa-audio.voanews.eu/vle/2016/04/14/442a6a50-693e-411f-8cff-99e40d16614c.mp3) | 725 721 | `0cfd6224bc3b53319acc1b535cc81908f8f9880f8dcee1e0c2a8ff697d5c9a66` |

Lesson 1 predates this research — it arrived with the app and its source URL is recorded
above, but the audio URL it was fetched from was not, so that cell is left blank rather than
reconstructed. Its hash is the shipped file's, recorded for integrity; unlike the other five
it has not been checked against the publisher's copy. Its cue timings are hand-authored round
numbers (0, 3, 7, 9, 12, 18, 23, 26 s), not ASR-aligned like the five below — which is worth
knowing before treating its transcript as evidence of anything but the words.

VOA's terms should still be re-read before this app is deployed to an audience.

### Shipping them unmodified has a cost, and it is visible

The six files span **8 dB of integrated loudness**, because VOA's own mastering varies across
the series and nothing here corrects it:

| Lesson | 1 | 2 | 4 | 5 | 6 | 10 |
| --- | --- | --- | --- | --- | --- | --- |
| Integrated | −25.2 | −23.2 | −19.0 | −17.1 | −18.0 | −19.4 LUFS |

Lesson 1 is 8 dB quieter than Lesson 5, so a learner moving between them will reach for the
volume. The alternative — normalising them — would mean modifying a publisher's audio to
match two Wikipedia readings that had to be normalised for a different reason (they would
otherwise clip). Public-domain status permits it; leaving the publisher's file untouched and
writing the variance down here is the more honest of the two, and it is reversible if the
player ever grows a gain control.

### How the transcripts were made

VOA publishes the dialogue on each lesson page, so the words are the publisher's. The
**timings** are `mlx-whisper` (large-v3-turbo) word-level output aligned to that published
text with `difflib` — the same division as the Mandarin episodes, for the same reason: the
published text is authoritative and the ASR is a clock.

One deviation, in Lesson 10: the published dialogue ends with a line **"Ashley: Great!"** that
is not in the audio. The recording's tail is *"Come on!"* followed by three *"Hey!"*s. The
line is dropped from the transcript rather than shown against silence; nothing else in the
five lessons diverges. All five are seeded `verifiedLesson: true` on the strength of the
publisher's own dialogue.

### The speech rates

Measured, not estimated, and by one convention across the catalogue: **words over the speech
span** — first speech onset to last speech offset, internal pauses included, leading and
trailing silence excluded (the same shape as the `cpm` figures above).

| Lesson | Words | Speech span | Rate | Silence at −40 dB |
| --- | --- | --- | --- | --- |
| 1 | 41 | 29.6 s | ≈ 83 wpm | none ≥ 0.3 s |
| 2 | 89 | 47.5 s | ≈ 112 wpm | 2.6 s · 5% |
| 4 | 161 | 87.9 s | ≈ 110 wpm | 16.8 s · 19% |
| 5 | 95 | 58.8 s | ≈ 97 wpm | 22.5 s · 37% |
| 6 | 147 | 105.9 s | ≈ 83 wpm | 24.4 s · 23% |
| 10 | 145 | 89.3 s | ≈ 97 wpm | 21.3 s · 24% |

Lesson 5 is the gentlest thing in the catalogue and Lesson 6 the slowest, and those two facts
are not the same fact: Lesson 6 is slower per word but gives less silence between them.
Lesson 1 ties Lesson 6 on rate over a third of the length — and on hand-authored timings, so
treat its 83 as the weakest number in the table.
