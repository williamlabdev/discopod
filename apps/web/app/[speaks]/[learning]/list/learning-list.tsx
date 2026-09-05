'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AudioLines, Bookmark, BookOpenText, Check, Clock3, Play, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { EpisodeCard } from '@/lib/catalogue';
import { pairPath, type LanguagePair } from '@/lib/language';
import {
  formatPosition,
  readAllProgress,
  readList,
  writeList,
  type EpisodeProgress,
} from '@/lib/learner-store';
import { PairNav } from '../pair-nav';

/**
 * One line of the list: a catalogue card, plus whatever this device remembers
 * about it. `progress` is null for an episode that was saved and never opened,
 * which is a different state from one opened and abandoned at 00:00 — the
 * second has been listened to, however briefly, and the copy says so.
 */
interface Entry {
  card: EpisodeCard;
  progress: EpisodeProgress | null;
  onList: boolean;
}

/**
 * The learner state the empty page shows instead of nothing.
 *
 * The episodes are real — they come from the catalogue this build shipped, so
 * every title, level and duration on screen is true and every link works. The
 * positions and the word counts are invented, which is why the page says so
 * above them and why nothing here is ever written to storage. The moment the
 * device has anything of its own, this disappears.
 */
const SAMPLE_STATE = [
  // 18 seconds because the shortest episode in the catalogue is 30, and a
  // sample position has to sit inside the duration printed on the same line —
  // "stopped at 00:42" against "30 sec" is the page contradicting itself in a
  // panel whose whole job is to show what the page normally says.
  { currentTime: 18, complete: false, savedWords: 4, answeredCount: 2 },
  { currentTime: 0, complete: false, savedWords: 0, answeredCount: 0 },
  { currentTime: 0, complete: true, savedWords: 7, answeredCount: 3 },
];

export function LearningList({ cards, pair }: { cards: EpisodeCard[]; pair: LanguagePair }) {
  const home = pairPath(pair);

  // Null until the device has been read. Rendering `[]` would let the page say
  // "nothing saved yet" for a frame to a learner who has twelve episodes saved.
  const [savedIds, setSavedIds] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<EpisodeProgress[]>([]);

  // Deferred a tick for the same reason the episode page defers its own
  // rehydration: reading localStorage is synchronising with the outside, and
  // `react-compiler` rejects setState straight from an effect body.
  useEffect(() => {
    queueMicrotask(() => {
      setSavedIds(readList(pair));
      setProgress(readAllProgress(pair, cards.map((card) => ({ id: card.id }))));
    });
  }, [cards, pair]);

  const entries = useMemo((): Entry[] => {
    if (savedIds === null) return [];
    const progressById = new Map(progress.map((item) => [item.episodeId, item]));
    return cards
      .filter((card) => savedIds.includes(card.id) || progressById.has(card.id))
      .map((card) => ({
        card,
        progress: progressById.get(card.id) ?? null,
        onList: savedIds.includes(card.id),
      }));
  }, [cards, progress, savedIds]);

  const isSample = savedIds !== null && entries.length === 0;

  const sample = useMemo((): Entry[] => {
    if (!isSample) return [];
    return cards.slice(0, SAMPLE_STATE.length).map((card, index) => {
      const state = SAMPLE_STATE[index];
      return {
        card,
        progress: state.savedWords === 0 && !state.complete && state.currentTime === 0
          ? null
          : {
              episodeId: card.id,
              currentTime: state.currentTime,
              complete: state.complete,
              // Counted, never listed: the vocabulary list must not show a word
              // this learner has not saved, so the sample stops at a number.
              savedWords: [],
              answeredCount: state.answeredCount,
              checked: state.complete,
            },
        onList: true,
      };
    });
  }, [cards, isSample]);

  const shown = isSample ? sample : entries;
  const sampleWords = (index: number) => SAMPLE_STATE[index]?.savedWords ?? 0;

  const inProgress = shown.filter((entry) => entry.progress && !entry.progress.complete);
  const notStarted = shown.filter((entry) => !entry.progress);
  const finished = shown.filter((entry) => entry.progress?.complete);

  const remove = (id: string) => {
    setSavedIds((current) => {
      const next = (current ?? []).filter((item) => item !== id);
      writeList(pair, next);
      return next;
    });
  };

  const add = (id: string) => {
    setSavedIds((current) => {
      const next = [...(current ?? []), id];
      writeList(pair, next);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1100px] px-5 pb-16 sm:px-8 lg:px-12">
        <PairNav
          active="list"
          listCount={savedIds === null ? null : savedIds.length}
          pair={pair}
          wordCount={savedIds === null ? null : progress.reduce((total, item) => total + item.savedWords.length, 0)}
        />

        <header className="pb-10 pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your learning list
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.05] tracking-[-0.045em] sm:text-5xl">
            Where you left off.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Everything here is stored on this device only, under {pair.speaks} → {pair.learning}.
            Nothing is uploaded, and clearing your browser data clears this list.
          </p>
        </header>

        {isSample && <SampleNotice />}

        {savedIds === null ? (
          <p className="py-10 text-sm text-muted-foreground">Reading this device…</p>
        ) : (
          <div className="space-y-12">
            <Section
              cards={inProgress}
              home={home}
              onAdd={add}
              onRemove={remove}
              readOnly={isSample}
              sampleWords={isSample ? sampleWords : null}
              shown={shown}
              subtitle="Picked up where the audio stopped, not where a percentage says you are."
              title="Continue listening"
            />
            <Section
              cards={notStarted}
              home={home}
              onAdd={add}
              onRemove={remove}
              readOnly={isSample}
              sampleWords={isSample ? sampleWords : null}
              shown={shown}
              subtitle="Saved from discover, not opened yet."
              title="Saved for later"
            />
            <Section
              cards={finished}
              home={home}
              onAdd={add}
              onRemove={remove}
              readOnly={isSample}
              sampleWords={isSample ? sampleWords : null}
              shown={shown}
              subtitle="Listened to the end. Worth a second pass without the transcript."
              title="Finished"
            />
          </div>
        )}

        <Link
          className="mt-14 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/85"
          href={home}
        >
          <Sparkles className="size-4" />
          Find something to add
        </Link>
      </div>
    </main>
  );
}

function SampleNotice() {
  return (
    <div className="rounded-[22px] border border-dashed border-border bg-secondary/40 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Sample list</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        You have not saved anything yet, so this is a made-up list showing what the page does. The
        episodes are real and the links work; the positions and the saved-word counts are invented,
        and none of it has been written to this device. Save an episode on discover and it replaces
        this immediately.
      </p>
    </div>
  );
}

function Section({
  cards,
  home,
  onAdd,
  onRemove,
  readOnly,
  sampleWords,
  shown,
  subtitle,
  title,
}: {
  cards: Entry[];
  home: string;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
  sampleWords: ((index: number) => number) | null;
  shown: Entry[];
  subtitle: string;
  title: string;
}) {
  if (cards.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-3">
        <h2 className="font-serif text-2xl tracking-[-0.03em]">{title}</h2>
        <span className="shrink-0 text-xs text-muted-foreground">{cards.length}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <ul className="mt-5 space-y-3">
        {cards.map((entry) => (
          <Row
            entry={entry}
            home={home}
            key={entry.card.id}
            onAdd={onAdd}
            onRemove={onRemove}
            readOnly={readOnly}
            wordCount={
              sampleWords ? sampleWords(shown.indexOf(entry)) : (entry.progress?.savedWords.length ?? 0)
            }
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  entry,
  home,
  onAdd,
  onRemove,
  readOnly,
  wordCount,
}: {
  entry: Entry;
  home: string;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  readOnly: boolean;
  wordCount: number;
}) {
  const { card, progress, onList } = entry;
  return (
    <li className="flex flex-col gap-4 rounded-[22px] border border-border bg-card p-4 sm:flex-row sm:items-center">
      {/* Decoration, and only that. It held the show title's first two
          characters, which reads as a monogram in Chinese and as the debris of
          a word in English ("Le" for Let's Learn English). The title is spelled
          out on the line beside it either way. */}
      <div
        className={`${card.tone} ${card.ink} grid size-20 shrink-0 place-items-center rounded-[16px]`}
        aria-hidden="true"
      >
        <AudioLines className="size-7 opacity-70" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {card.showTitle} · {card.publisher}
        </p>
        <h3 className="mt-1 truncate font-semibold tracking-[-0.02em]">
          <Link className="hover:underline" href={`${home}/episode/${card.id}`}>
            {card.episodeTitle}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {card.level} · {card.cefr}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {card.duration}
          </span>
          {progress?.complete ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Check className="size-3.5" />
              Finished
            </span>
          ) : progress && progress.currentTime > 0 ? (
            /* A position, not a percentage. The catalogue's `duration` is the
               publisher's stated length, which is not reliably the length of
               the file we ship, and a progress bar drawn against the wrong
               denominator is a confident lie. `00:42` is checkable. */
            <span className="inline-flex items-center gap-1">
              <Play className="size-3.5" />
              Stopped at {formatPosition(progress.currentTime)}
            </span>
          ) : progress ? (
            /* Opened, and the audio never moved — which is what saving a word
               off the transcript without pressing play looks like. Reporting
               that as "stopped at 00:00" would be true and useless. */
            <span>Opened, not played yet</span>
          ) : (
            <span>Not started</span>
          )}
          {wordCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <BookOpenText className="size-3.5" />
              {wordCount} {wordCount === 1 ? 'word' : 'words'} saved
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/85"
          href={`${home}/episode/${card.id}`}
        >
          {progress && !progress.complete ? 'Continue' : 'Open'}
        </Link>
        {!readOnly &&
          (onList ? (
            <Button
              aria-label={`Remove ${card.episodeTitle} from my learning list`}
              className="size-10 rounded-full"
              onClick={() => onRemove(card.id)}
              size="icon"
              variant="outline"
            >
              <X className="size-4" />
            </Button>
          ) : (
            /* Reachable only through progress: this episode was opened but
               never saved. Removing it would mean deleting the listening
               position, which is not what a bookmark button should do — so the
               only action offered is the additive one. */
            <Button
              aria-label={`Add ${card.episodeTitle} to my learning list`}
              className="size-10 rounded-full"
              onClick={() => onAdd(card.id)}
              size="icon"
              variant="outline"
            >
              <Bookmark className="size-4" />
            </Button>
          ))}
      </div>
    </li>
  );
}
