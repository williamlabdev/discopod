# ADR 0012 — DiscoPod runs in two directions, and `en → en` is not one of them

- **Status:** Accepted
- **Date:** 2026-09-05
- **Owner of the judgement calls:** William
- **Closes:** [ADR 0003](0003-model-the-learner-language-pair.md) decision 6. That decision
  declared today's catalogue `en → en` and said why the declaration was honest at the time:
  there was no second language in the content to put on the other side. There is now, in
  both directions, so the declaration has done its job and the pair goes.
- **Builds on:** [ADR 0010](0010-the-chinese-discopod-teaches-is-traditional.md), which
  supplied the Chinese half, and
  [ADR 0006](0006-separate-spoken-language-from-written-form.md).

## Context

The product serves two audiences, and `docs/VISION.md` has said so since it was written:

> **I speak \_\_\_, I'm learning \_\_\_** — reversible, so the app serves a Chinese speaker
> learning English as fully as the reverse, with the transcript, word list, and review all
> flipping sides.

Both of those are now real, one episode each:

| Pair | Audio | Transcript | Explanations | Who it is for |
| --- | --- | --- | --- | --- |
| `en → zh-Hant` | Mandarin | `zh-Hant` | English | an English speaker learning Chinese |
| `zh-Hant → en` | English | `en` | Chinese | a Chinese speaker learning English |

And a third pair was being published alongside them: `en → en`. English audio, English
transcript, English explanations. It was the *first* option on the pair chooser, it had
its own route subtree, and `DEFAULT_PAIR` pointed at it, so a request that named no pair
got it.

Nothing about it is a bug in the sense of a defect: it is what `listPairs` correctly
derived from a catalogue where episode 7 carries English explanations. ADR 0003 decision 6
declared it deliberately, and while it was the only pair with any content, naming it was
better than hiding it.

That reason has expired. `en → en` teaches nobody English, and a learner who lands on the
front page is now offered it before either of the two things the product actually does.

## Decision

### 1. A pair whose two sides are the same language is not served

One line in `CatalogService.listPairs`: `if (speaks === learning) continue`. The site drops
from three route subtrees to two, and the pair chooser from three options to two.

Excluded at the *pair* level, not by deleting data. Episode 7's English explanations stay
exactly where they are, because they are what `catalog.zh-Hant.json` was translated from —
removing them would take the Chinese pair down with the English one. `SEED_PAIR` also stays
`en → en`, because that constant is a statement about which language the strings in
`catalog.seed.json` are *written in*, which is still true and is a different question from
which pairs the catalogue serves.

The rule is general rather than a special case for `en`. If a Chinese seed ever carries
Chinese explanations, `zh-Hant → zh-Hant` will not appear either, and nobody will have to
remember to exclude it.

### 2. `DEFAULT_PAIR` is `en → zh-Hant`

It has to move, because it pointed at the pair being removed. It becomes an English speaker
learning Chinese, matching ADR 0010's decision about what Chinese this product teaches.

This is a default, not a ranking. `DEFAULT_PAIR` answers exactly one question — what a
caller that names no pair gets — and the other direction is served as fully. The onboarding
screen in VISION.md is what chooses for a real learner; nobody arrives through a bare
`curl /api/episodes`.

A bare request now returns Mandarin content where it used to return English. That is a
visible change to callers, and it is the right one: the previous answer was a catalogue in
a language nobody was learning.

### 3. CI asserts the absence, not just the presence

`test ! -e apps/web/out/en/en.html` sits next to the two `test -f` lines. A pair coming
back is exactly the kind of regression that renders perfectly — a working page, in the
wrong product — and the export is where it would show up first.

## Consequences we accept

- **Episode 7 now reaches learners through one pair instead of two.** Its English-language
  presentation is no longer published anywhere, even though it is authored and correct. It
  survives as the source the Chinese overlay is translated from.
- **`DEFAULT_PAIR` is a choice this ADR cannot fully justify.** Either direction would have
  worked; `en → zh-Hant` was picked for consistency with ADR 0010, not because the English
  speaker matters more. If the Taiwanese-learner side turns out to be the market, this
  constant is one line and this paragraph is the record that it was a coin with a reason
  rather than a conviction.
- **The catalogue is now two episodes in two pairs, and every pair has exactly one.**
  Removing a pair made that arithmetic more visible, not worse. The product's shape is
  right and its shelf is nearly empty, which is a content problem and stays one.
