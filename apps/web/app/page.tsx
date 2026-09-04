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
    <main className="grid min-h-screen place-items-center bg-background px-5 py-16 text-foreground">
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">DiscoPod</p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em]">Choose your languages</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Pick the language you want explanations in, and the language you are learning by ear.
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {pairs.map((pair) => (
            <li key={pairPath(pair)}>
              <Link
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition hover:border-foreground/25 hover:bg-secondary"
                href={pairPath(pair)}
                hrefLang={pair.speaks}
              >
                <span className="text-base font-semibold" lang={pair.speaks}>
                  {LANGUAGE_NAMES[pair.speaks]}
                </span>
                <span className="text-sm text-muted-foreground">
                  learning <span lang={pair.learning}>{LANGUAGE_NAMES[pair.learning]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
