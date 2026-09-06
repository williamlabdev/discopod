'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AudioLines,
  BookOpenText,
  Check,
  Clock3,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AutoTranslated } from '../auto-translated';
import type { EpisodeCard } from '@/lib/catalogue';
import { interfaceCopy } from '@/lib/interface-copy';
import { pairPath, type LanguagePair, type LanguageTag } from '@/lib/language';
import {
  formatPosition,
  readAllProgress,
  readList,
  writeList,
  writeListeningPosition,
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
 * Whether this device has a listening position for the episode.
 *
 * A stored record is not enough to mean "listened to": saving a word off the
 * transcript writes one without the audio ever moving, and an episode taken off
 * this list keeps its words and its answers. So the list is bookmarks plus what
 * has actually been played, and this is the one place that says what that means.
 */
function hasPosition(progress: EpisodeProgress | null): boolean {
  return progress !== null && (progress.currentTime > 0 || progress.complete);
}

/**
 * What one removal undid, kept until the next one.
 *
 * Removing an episode discards a listening position, which nothing else can
 * regenerate except listening again. That is small enough not to warrant a
 * confirmation dialog and large enough to warrant being reversible.
 */
interface Undo {
  id: string;
  title: string;
  wasOnList: boolean;
  currentTime: number;
  complete: boolean;
  hadProgress: boolean;
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

export function LearningList({
  cards,
  pair,
}: {
  cards: EpisodeCard[];
  pair: LanguagePair;
}) {
  const home = pairPath(pair);
  const copy = interfaceCopy(pair.speaks);

  // Null until the device has been read. Rendering `[]` would let the page say
  // "nothing saved yet" for a frame to a learner who has twelve episodes saved.
  const [savedIds, setSavedIds] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<EpisodeProgress[]>([]);
  const [undo, setUndo] = useState<Undo | null>(null);

  // Deferred a tick for the same reason the episode page defers its own
  // rehydration: reading localStorage is synchronising with the outside, and
  // `react-compiler` rejects setState straight from an effect body.
  useEffect(() => {
    queueMicrotask(() => {
      setSavedIds(readList(pair));
      setProgress(
        readAllProgress(
          pair,
          cards.map((card) => ({ id: card.id })),
        ),
      );
    });
  }, [cards, pair]);

  const entries = useMemo((): Entry[] => {
    if (savedIds === null) return [];
    const progressById = new Map(
      progress.map((item) => [item.episodeId, item]),
    );
    return cards
      .filter(
        (card) =>
          savedIds.includes(card.id) ||
          hasPosition(progressById.get(card.id) ?? null),
      )
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
        progress:
          state.savedWords === 0 && !state.complete && state.currentTime === 0
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

  const inProgress = shown.filter(
    (entry) => hasPosition(entry.progress) && !entry.progress?.complete,
  );
  const notStarted = shown.filter((entry) => !hasPosition(entry.progress));
  const finished = shown.filter((entry) => entry.progress?.complete);

  /**
   * Take the episode off this list, and mean it.
   *
   * Clearing the bookmark alone used to leave the row exactly where it was for
   * anything the learner had opened, because the list is bookmarks *plus*
   * whatever has a position — so the button read as broken. Removal now clears
   * both, and keeps the saved words and the quiz answers, which is why the
   * undo line says where the words went.
   */
  const remove = (entry: Entry) => {
    const id = entry.card.id;
    setUndo({
      id,
      title: entry.card.episodeTitle,
      wasOnList: entry.onList,
      currentTime: entry.progress?.currentTime ?? 0,
      complete: entry.progress?.complete ?? false,
      hadProgress: entry.progress !== null,
    });

    setSavedIds((current) => {
      const next = (current ?? []).filter((item) => item !== id);
      writeList(pair, next);
      return next;
    });

    if (entry.progress) {
      writeListeningPosition(pair, id, { currentTime: 0, complete: false });
      setProgress((current) =>
        current.map((item) =>
          item.episodeId === id
            ? { ...item, currentTime: 0, complete: false }
            : item,
        ),
      );
    }
  };

  const restore = () => {
    if (!undo) return;
    if (undo.wasOnList) {
      setSavedIds((current) => {
        const next = current?.includes(undo.id)
          ? current
          : [...(current ?? []), undo.id];
        writeList(pair, next);
        return next;
      });
    }
    if (undo.hadProgress) {
      writeListeningPosition(pair, undo.id, {
        currentTime: undo.currentTime,
        complete: undo.complete,
      });
      setProgress((current) =>
        current.map((item) =>
          item.episodeId === undo.id
            ? {
                ...item,
                currentTime: undo.currentTime,
                complete: undo.complete,
              }
            : item,
        ),
      );
    }
    setUndo(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1100px] px-5 pb-16 sm:px-8 lg:px-12">
        <PairNav
          active="list"
          listCount={savedIds === null ? null : savedIds.length}
          pair={pair}
          wordCount={
            savedIds === null
              ? null
              : progress.reduce(
                  (total, item) => total + item.savedWords.length,
                  0,
                )
          }
        />

        <header className="pb-10 pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {copy.list.eyebrow}
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.05] tracking-[-0.045em] sm:text-5xl">
            {copy.list.heading}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {copy.list.deviceOnly(`${pair.speaks} → ${pair.learning}`)}
          </p>
        </header>

        {isSample && <SampleNotice copy={copy} />}

        {undo && (
          <div className="mb-8 flex flex-col gap-3 rounded-[18px] border border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {copy.list.removed(undo.title)} {copy.list.wordsRemain}
            </p>
            <Button
              className="shrink-0 rounded-full"
              onClick={restore}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="size-4" />
              {copy.list.undo}
            </Button>
          </div>
        )}

        {savedIds === null ? (
          <p className="py-10 text-sm text-muted-foreground">
            {copy.common.readingDevice}
          </p>
        ) : (
          <div className="space-y-12">
            <Section
              copy={copy}
              cards={inProgress}
              home={home}
              language={pair.speaks}
              onRemove={remove}
              readOnly={isSample}
              sampleWords={isSample ? sampleWords : null}
              shown={shown}
              subtitle={copy.list.continueBody}
              title={copy.list.continueTitle}
            />
            <Section
              copy={copy}
              cards={notStarted}
              home={home}
              language={pair.speaks}
              onRemove={remove}
              readOnly={isSample}
              sampleWords={isSample ? sampleWords : null}
              shown={shown}
              subtitle={copy.list.savedBody}
              title={copy.list.savedTitle}
            />
            <Section
              copy={copy}
              cards={finished}
              home={home}
              language={pair.speaks}
              onRemove={remove}
              readOnly={isSample}
              sampleWords={isSample ? sampleWords : null}
              shown={shown}
              subtitle={copy.list.finishedBody}
              title={copy.list.finishedTitle}
            />
          </div>
        )}

        <Link
          className="mt-14 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/85"
          href={home}
        >
          <Sparkles className="size-4" />
          {copy.list.findSomething}
        </Link>
      </div>
    </main>
  );
}

function SampleNotice({ copy }: { copy: ReturnType<typeof interfaceCopy> }) {
  return (
    <div className="rounded-[22px] border border-dashed border-border bg-secondary/40 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {copy.list.sampleTitle}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {copy.list.sampleBody}
      </p>
    </div>
  );
}

function Section({
  cards,
  copy,
  home,
  language,
  onRemove,
  readOnly,
  sampleWords,
  shown,
  subtitle,
  title,
}: {
  cards: Entry[];
  copy: ReturnType<typeof interfaceCopy>;
  home: string;
  language: LanguageTag;
  onRemove: (entry: Entry) => void;
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
        <span className="shrink-0 text-xs text-muted-foreground">
          {cards.length}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <ul className="mt-5 space-y-3">
        {cards.map((entry) => (
          <Row
            copy={copy}
            entry={entry}
            language={language}
            home={home}
            key={entry.card.id}
            onRemove={onRemove}
            readOnly={readOnly}
            wordCount={
              sampleWords
                ? sampleWords(shown.indexOf(entry))
                : (entry.progress?.savedWords.length ?? 0)
            }
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  entry,
  copy,
  home,
  language,
  onRemove,
  readOnly,
  wordCount,
}: {
  copy: ReturnType<typeof interfaceCopy>;
  entry: Entry;
  home: string;
  language: LanguageTag;
  onRemove: (entry: Entry) => void;
  readOnly: boolean;
  wordCount: number;
}) {
  const { card, progress } = entry;
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
              {copy.list.finished}
            </span>
          ) : progress && progress.currentTime > 0 ? (
            /* A position, not a percentage. The catalogue's `duration` is the
               publisher's stated length, which is not reliably the length of
               the file we ship, and a progress bar drawn against the wrong
               denominator is a confident lie. `00:42` is checkable. */
            <span className="inline-flex items-center gap-1">
              <Play className="size-3.5" />
              {copy.list.stoppedAt(formatPosition(progress.currentTime))}
            </span>
          ) : progress ? (
            /* Opened, and the audio never moved — which is what saving a word
               off the transcript without pressing play looks like. Reporting
               that as "stopped at 00:00" would be true and useless. */
            <span>{copy.list.openedNotPlayed}</span>
          ) : (
            <span>{copy.list.notStarted}</span>
          )}
          {wordCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <BookOpenText className="size-3.5" />
              {copy.list.savedWords(wordCount)}
            </span>
          )}
          {card.autoTranslated && <AutoTranslated language={language} />}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/85"
          href={`${home}/episode/${card.id}`}
        >
          {progress && !progress.complete ? copy.list.continue : copy.list.open}
        </Link>
        {/* One button, one meaning. A row is here because it was saved, or
            because it was listened to, or both — and a learner clicking X wants
            it gone, not a report of which of those two it was. What survives is
            stated in the undo line, not guessed at from an icon. */}
        {!readOnly && (
          <Button
            aria-label={copy.list.removeFromList(card.episodeTitle)}
            className="size-10 rounded-full"
            onClick={() => onRemove(entry)}
            size="icon"
            variant="outline"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
