import Link from 'next/link';
import { Headphones } from 'lucide-react';

import { interfaceCopy } from '@/lib/interface-copy';
import { pairPath, type LanguagePair } from '@/lib/language';

/**
 * The header shared by the learning list and the vocabulary list.
 *
 * Every link stays inside the pair the reader arrived under — a learner who
 * came in at `zh-Hant → en` must not be handed the other direction's catalogue
 * by a nav link, because the two are different apps wearing the same layout.
 * Discover keeps its own header: it carries a mobile menu and a level filter
 * that these two pages have no use for.
 */
export function PairNav({
  pair,
  active,
  listCount,
  wordCount,
}: {
  pair: LanguagePair;
  active: 'list' | 'words';
  listCount: number | null;
  wordCount: number | null;
}) {
  const home = pairPath(pair);
  const copy = interfaceCopy(pair.speaks).common;
  const link = (target: 'list' | 'words') =>
    `transition-colors ${active === target ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <header className="flex h-20 items-center justify-between border-b border-border/70">
      <Link
        className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]"
        href={home}
      >
        <span className="grid size-9 place-items-center rounded-full bg-foreground text-background">
          <Headphones className="size-[18px]" />
        </span>
        <span className="text-xl">DiscoPod</span>
      </Link>
      <nav
        className="flex items-center gap-5 text-sm sm:gap-8"
        aria-label={copy.mainNavigation}
      >
        <Link
          className="text-muted-foreground transition-colors hover:text-foreground"
          href={home}
        >
          {copy.discover}
        </Link>
        <Link className={link('list')} href={`${home}/list`}>
          <span className="hidden sm:inline">{copy.myLearningList}</span>
          <span className="sm:hidden">{copy.list}</span>
          <Count value={listCount} />
        </Link>
        <Link className={link('words')} href={`${home}/words`}>
          <span className="hidden sm:inline">{copy.vocabulary}</span>
          <span className="sm:hidden">{copy.words}</span>
          <Count value={wordCount} />
        </Link>
      </nav>
    </header>
  );
}

/**
 * A count, once the device has been read.
 *
 * `null` until then — these pages prerender, so the server has no idea what
 * this learner saved, and rendering a `0` that becomes `7` on hydration would
 * be telling them something false for one frame.
 */
function Count({ value }: { value: number | null }) {
  // Also nothing at zero. A grey `0` beside every link is a badge that only
  // ever reports absence, and the word next to it already says what is there.
  if (value === null || value === 0) return null;
  return (
    <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
      {value}
    </span>
  );
}
