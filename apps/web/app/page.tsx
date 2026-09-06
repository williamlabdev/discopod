import Link from 'next/link';

import { loadPairs } from '@/lib/catalogue';
import { LANGUAGE_NAMES, pairPath } from '@/lib/language';

/**
 * What now lives at `/`.
 *
 * Every real page moved under `/[speaks]/[learning]/…`, so something has to
 * stand at the root, and a static export has no server to redirect with — no
 * middleware, no 302. Guessing from `navigator.language` in the browser would
 * put a language choice behind a flash of the wrong page and a client-side
 * jump, which is a worse answer than asking.
 *
 * So this asks, in each language's own words. The list is the API's, not a
 * hard-coded one: a pair appears here when some episode carries a layer in that
 * language, and disappears when none does.
 */
export default async function PairChooser() {
  const pairs = await loadPairs();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-10 text-foreground sm:px-8 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-[-7rem] size-[28rem] rounded-full bg-primary/8 blur-3xl sm:size-[36rem]"
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <section aria-labelledby="discopod-intro">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            DiscoPod
          </p>
          <h1
            id="discopod-intro"
            className="mt-5 max-w-3xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
          >
            Find podcasts your ears are ready for.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            DiscoPod ranks podcast episodes by how likely you are to follow
            them—not by what&apos;s popular. Pick your languages, choose your
            level, and get a clear place to start.
          </p>

          <dl className="mt-9 grid max-w-2xl gap-5 border-y border-border py-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold">Matched to your level</dt>
              <dd className="mt-1 text-sm leading-5 text-muted-foreground">
                Speech rate, vocabulary, and speaker count shape the ranking.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Transcript-first</dt>
              <dd className="mt-1 text-sm leading-5 text-muted-foreground">
                A timestamped transcript stays beside the audio.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">A reason for every pick</dt>
              <dd className="mt-1 text-sm leading-5 text-muted-foreground">
                See exactly why an episode suits your listening level.
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby="language-heading"
          className="rounded-[2rem] border border-border bg-card/95 p-6 shadow-[0_24px_70px_-36px_color-mix(in_oklch,var(--foreground)_35%,transparent)] backdrop-blur sm:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Start listening
          </p>
          <h2
            id="language-heading"
            className="mt-3 font-serif text-3xl tracking-[-0.035em] sm:text-4xl"
          >
            Choose your languages
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            First is the language you want explanations in. Second is the
            language you want to understand by ear.
          </p>

          <ul className="mt-7 flex flex-col gap-3">
            {pairs.map((pair) => (
              <li key={pairPath(pair)}>
                <Link
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-5 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={pairPath(pair)}
                  hrefLang={pair.speaks}
                >
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      I speak
                    </span>
                    <span
                      className="mt-0.5 block text-base font-semibold"
                      lang={pair.speaks}
                    >
                      {LANGUAGE_NAMES[pair.speaks]}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      I&apos;m learning
                    </span>
                    <span
                      className="mt-0.5 block text-base font-semibold text-primary"
                      lang={pair.learning}
                    >
                      {LANGUAGE_NAMES[pair.learning]}{' '}
                      <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
