'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Check, Languages, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DEMO_CUES, DEMO_EPISODE, DEMO_LEVEL, DEMO_SHOW, type DemoCue } from './fixture';

/** Which rung of support is open on a cue. 1 is the resting state. */
type Rung = 1 | 2 | 3;

/**
 * The hard expression, marked where it appears in the restatement.
 *
 * This is the whole argument of the feature made visible: the learner should be
 * able to see that the word they could not follow is still there, explained,
 * rather than quietly swapped for an easier one. Criterion 6 rejects a
 * generation that lost it; this is the reader's own check on the same thing.
 */
function MarkExpression({ text, expression }: { text: string; expression: string }) {
  const at = text.indexOf(expression);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-[#f5d8ad] px-1 text-inherit">{expression}</mark>
      {text.slice(at + expression.length)}
    </>
  );
}

function Cue({ cue }: { cue: DemoCue }) {
  const [rung, setRung] = useState<Rung>(1);
  const [saved, setSaved] = useState(false);
  const degraded = cue.restatement === null;

  // One tap advances one rung — except on a cue whose rung 2 failed validation,
  // where the next rung up from 1 is 3. Criterion 3: rung 3 is always reachable.
  const nextRung: Rung | null = rung === 1 ? (degraded ? 3 : 2) : rung === 2 ? 3 : null;
  const nextLabel = nextRung === 2 ? 'In other words' : 'Show translation';

  return (
    <li className="border-b border-border/70 py-6 last:border-0">
      <div className="grid grid-cols-[64px_1fr] gap-2">
        <span className="pt-1 text-xs font-semibold text-primary">{cue.time}</span>
        <div>
          {/* Rung 1. Never replaced, never hidden — it is what the learner
              checks the generated line against, and the reason the two lines
              sit one above the other. */}
          <p className="text-base leading-8 sm:text-lg">
            <strong className="mr-2 text-sm">{cue.speaker}</strong>
            {cue.text}
          </p>

          {rung >= 2 && cue.restatement && (
            <div className="mt-3 rounded-2xl border border-dashed border-primary/40 bg-secondary/50 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                <Sparkles className="size-3.5" />
                In other words · generated, not spoken
              </p>
              <p className="mt-2 text-base leading-8">
                <MarkExpression text={cue.restatement.text} expression={cue.restatement.hardExpression} />
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSaved((value) => !value)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-secondary"
                >
                  {saved ? <Check className="size-3.5" /> : <Bookmark className="size-3.5" />}
                  {saved ? 'Saved' : `Save “${cue.restatement.hardExpression}”`}
                </button>
                {/* Criterion 5, shown rather than asserted: the word is saved
                    from the restatement, and what it keeps is the original
                    line, speaker and timestamp. Review has to prompt with real
                    audio; a saved word whose context was generated text would
                    have nothing to play. */}
                {saved && (
                  <span className="text-[11px] leading-5 text-muted-foreground">
                    Saved with the original line — {cue.speaker}, {cue.time}.
                  </span>
                )}
              </div>
            </div>
          )}

          {rung === 3 && (
            <div className="mt-3 rounded-2xl bg-secondary/70 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Languages className="size-3.5" />
                Your language
              </p>
              <p className="mt-2 text-base leading-8" lang="zh-Hant">
                {cue.translation}
              </p>
              {degraded && (
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  No restatement for this line — the generated versions dropped “in vitro”, so they were
                  rejected rather than shown.
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {nextRung && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setRung(nextRung)}>
                {nextRung === 2 ? <Sparkles className="size-3.5" /> : <Languages className="size-3.5" />}
                {nextLabel}
              </Button>
            )}
            {/* Criterion 4: back to rung 1 in one tap, from wherever they are. */}
            {rung > 1 && (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setRung(1)}>
                <X className="size-3.5" />
                Collapse
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function InOtherWordsDemo() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[820px] px-5 pb-20 sm:px-8">
        <header className="flex h-20 items-center">
          <Link className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground" href="/">
            <ArrowLeft className="size-4" />
            DiscoPod
          </Link>
        </header>

        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">R24 · demo</p>
        <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-[-0.035em] sm:text-5xl">
          “In other words”
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          A middle rung between the line a learner could not follow and giving up on the target language.
          Tap a line for a restatement that keeps the hard expression and explains it in place; tap again
          for the translation.
        </p>
        {/* Say plainly what this page is. A demo that looks like the product is
            how a fixture ends up quoted as evidence that the feature works. */}
        <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
          <strong className="text-foreground">This is a mock-up.</strong> The episode, the cues and the
          restatements are hand-written to the R24 spec — nothing here was generated, cached or validated.
          The real restatements are a build artifact generated into the catalogue (ADR 0005), and that
          generator has not been built.
        </p>

        <section className="mt-9 rounded-[24px] border border-border bg-card px-5 py-2 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {DEMO_SHOW}
              </p>
              <h2 className="mt-1 font-serif text-2xl tracking-[-0.03em]">{DEMO_EPISODE}</h2>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
              {DEMO_LEVEL} · 中文 → English
            </span>
          </div>
          <ul>
            {DEMO_CUES.map((cue) => (
              <Cue key={cue.time} cue={cue} />
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-[24px] bg-secondary/60 p-6">
          <h3 className="font-serif text-2xl tracking-[-0.03em]">What to look at</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">The original never moves.</strong> The restatement is
              rendered below it, so the learner has something to check the generated line against.
            </li>
            <li>
              <strong className="text-foreground">The hard word survives.</strong> Highlighted in each
              restatement — <em>aggregates</em>, not “clumps” instead of it. A simplifier would delete
              exactly the thing the learner needed to learn.
            </li>
            <li>
              <strong className="text-foreground">The last line has no rung 2.</strong> Its generations
              dropped “in vitro”, failed validation twice, and the feature degrades to the translation
              rather than showing output it could not verify.
            </li>
            <li>
              <strong className="text-foreground">Saving a word keeps the spoken line.</strong> Not the
              generated one — review has to prompt with real audio.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
