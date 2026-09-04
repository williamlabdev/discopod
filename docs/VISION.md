# DiscoPod — Product Vision

**A podcast app for people who want to hear a language, not read a textbook.**

---

## The problem

Language study material is overwhelmingly written. Learners who have put in years of
reading and drilling still freeze when a native speaker opens their mouth at full
speed. The gap isn't vocabulary — it's ears. And the obvious remedy, listening to
real podcasts, fails for a specific reason: a native-level show is a wall of
undifferentiated sound. Without a way in, the learner bounces off in ninety seconds
and goes back to the textbook.

Meanwhile, every mainstream podcast app is built for people who already speak the
language. Their ranking signals — chart position, download counts, recency — are
useless to a learner. The most popular show in a language is frequently the worst
possible place to start: four hosts, no script, heavy slang, recorded in a bar.

## The product

DiscoPod is a full podcast app — discover, follow, download, listen — with every
surface re-tuned to answer one question: **can I follow this with my ears?**

Three things make it different.

### 1. The transcript is the app

Not a feature behind a tab. The player opens on the text, in both languages, and
playback moves through it word by word. The active word and the phrase that carries
its meaning highlight *together*, on both sides — because a learner's real question
is never "what does this word mean," it's "which sound was that word."

Transcripts come from RSS metadata where publishers supply them, and from our own
transcription where they don't. Translation and chunking are automatic: episodes are
divided by topic, not by arbitrary time slices, so a learner can take on ten minutes
about breakfast and stop at a natural seam.

The learner controls how much support is on screen. Reading aids (pinyin, zhuyin, or
nothing) and the whole native-language side are page-level switches, so the same
episode serves a first pass with everything visible and a second pass with nothing
but sound and characters. **Going ear-only is a one-tap graduation, not a settings
trip.**

**Support comes in rungs, not a switch.** The learner who hits a sentence they can't
follow shouldn't have to leave the language to get past it. The first step is *in other
words* — the same sentence said differently, still in the target language, with the
difficult expression kept and explained in place rather than swapped for an easy one.
The native-language side is the step after that, for when the first one wasn't enough.

This matters more than it sounds. Simplified input removes the hard structure, which
means it removes the exact thing the learner needed. Elaborated input keeps it and adds
redundancy around it — the way a good host defines a term mid-sentence and carries on.
Every show gets that property on demand, and the learner meets the hard expression
twice: once cold, once explained.

Which rung a learner stops at is also the sharpest thing we know about them. Resolving
at *in other words* means they are at the edge of what they can follow, which is exactly
where we are trying to put them. Reaching for the native-language side means we aimed
too high.

### 2. A show is a difficulty profile, not a feed

Publisher, episode count, and last-published date are the least useful facts about a
show for a learner, yet they're what every app leads with. DiscoPod leads with the
things that determine whether you'll finish an episode:

- **speech rate** — characters or words per second, against your level
- **vocabulary coverage** — what share of the running text you already know
- **voices at once** — one narrator is a different sport from four friends talking over each other
- **slang and accent load** — standard register, or deep regional

Above the episode list sits a **start here** pick with its reasoning stated in plain
language ("eleven minutes, one interviewee, the host repeats every question twice").
Episodes sort by suitability first; chronological is available, but it's the
secondary view, because a learner's best next episode is almost never the newest one.

### 3. Words leave the player with you

Tap any word for its meaning in context. Save it, and it carries its sentence, its
speaker, and its timestamp into review — so recall is prompted by *audio*, the way
the word will actually arrive next time. The quiz is listening practice, not
flashcards: which word did you hear, what filled the gap, what did that mean.

## How we rank

Our recommendations are not the charts. Two signals combine:

1. **Completion inside DiscoPod, segmented by level.** How far do learners at *your*
   level actually get through this episode before they quit? This is our proprietary
   signal and it compounds — the more people listen, the better the shelf gets.
2. **A model's judgement of learnability.** Speech rate, speaker count, audio
   cleanliness, vocabulary distribution, repetition, register. Every show is profiled
   before a human ever sees it, so a brand-new show with no listening data can still
   be placed correctly.

Popularity outside the app is a weak input, not the ranking.

## Onboarding

Three screens, Duolingo-plain. **I speak ___, I'm learning ___** — reversible, so the
app serves a Chinese speaker learning English as fully as the reverse, with the
transcript, word list, and review all flipping sides. Then topics the learner would
follow in their own language anyway. Then a shelf of shows filtered by level, each
with its profile and a stated reason it's here. **The learner is following real shows
before they've spent sixty seconds in setup.**

## Who this is for

The learner who has been at it for years and is tired of study materials that are
strictly written. Who doesn't want a graded reader read by a voice actor at half
speed — who wants native speakers having real conversations, with just enough
scaffolding to stay in the room. Intermediate plateau is the sweet spot; the
difficulty profile is what makes a beginner's first real podcast survivable and an
advanced learner's fifth one worth their time.

## What success looks like

- Learners **finish** episodes of native-speaker content they could not have followed a month earlier.
- Support comes down over time. The English side switches off, the reading aids switch off, and the transcript becomes a safety net rather than a crutch.
- The saved-word list is dominated by words heard in the wild, not words assigned.
- The show shelf gets better as the community listens, in a way no chart can copy.

## Principles

- **Listening is the skill.** Every feature is judged on whether it builds ears. Reading support exists to be outgrown.
- **State the reason.** Never surface a recommendation without saying why it's suitable. Learners are being asked to trust us with their time.
- **Real speech, always.** No slowed audio, no actors, no textbook dialogues. Scaffolding goes around the audio, never into it.
- **Both directions are first-class.** A language pair is symmetric or it isn't a pair.
- **The transcript is the interface.** If a feature crowds the text, the feature loses.

## Deliberately out of scope

Speaking practice and pronunciation scoring. Grammar instruction. Social feeds and
streaks. Original content production — we are the layer that makes the world's
existing podcasts learnable, not another publisher.
