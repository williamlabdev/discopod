'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AudioLines, Quote, Search, Sparkles } from 'lucide-react';

import { Input } from '@/components/ui/input';
import type { LearningLevel, VocabularyItem } from '@/lib/catalogue';
import { pairPath, type LanguagePair } from '@/lib/language';
import { formatPosition, readAllProgress, readList } from '@/lib/learner-store';
import { createSavedWord, type SavedWord } from '@/lib/saved-words';
import { PairNav } from '../pair-nav';

export interface EpisodeVocabulary {
  id: string;
  episodeTitle: string;
  showTitle: string;
  level: LearningLevel;
  vocabulary: VocabularyItem[];
}

/** A saved word with the episode it came from resolved back to a title. */
interface Row {
  word: SavedWord;
  episode: EpisodeVocabulary;
}

/**
 * How many words the sample invents, and from where.
 *
 * Real vocabulary entries from real episodes — the term, the gloss and the
 * sentence are all the catalogue's, so nothing on screen is made up except the
 * claim that this learner saved them. Nothing is written to storage.
 */
const SAMPLE_PER_EPISODE = [3, 2, 2];

export function VocabularyList({
  episodes,
  pair,
}: {
  episodes: EpisodeVocabulary[];
  pair: LanguagePair;
}) {
  const home = pairPath(pair);
  const [query, setQuery] = useState('');

  // Null until the device has been read — same reason as the learning list.
  const [rows, setRows] = useState<Row[] | null>(null);
  const [listCount, setListCount] = useState<number | null>(null);

  // Deferred a tick for the same reason the episode page defers its own
  // rehydration: reading localStorage is synchronising with the outside, and
  // `react-compiler` rejects setState straight from an effect body.
  useEffect(() => {
    queueMicrotask(() => {
      const byId = new Map(episodes.map((episode) => [episode.id, episode]));
      setRows(
        readAllProgress(pair, episodes).flatMap((item) => {
          const episode = byId.get(item.episodeId);
          return episode ? item.savedWords.map((word) => ({ word, episode })) : [];
        }),
      );
      setListCount(readList(pair).length);
    });
  }, [episodes, pair]);

  const isSample = rows !== null && rows.length === 0;

  const sample = useMemo((): Row[] => {
    if (!isSample) return [];
    return episodes.slice(0, SAMPLE_PER_EPISODE.length).flatMap((episode, index) =>
      episode.vocabulary
        .slice(0, SAMPLE_PER_EPISODE[index])
        .map((item) => ({ word: createSavedWord(pair, episode.id, item), episode })),
    );
  }, [episodes, isSample, pair]);

  // Memoised, not derived inline: `rows ?? []` is a fresh array on every
  // render, which would make the filter below recompute every time.
  const all = useMemo(() => (isSample ? sample : (rows ?? [])), [isSample, rows, sample]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((row) =>
      [row.word.term, row.word.meaning, row.word.sentence, row.episode.episodeTitle]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [all, query]);

  // Grouped by episode, because a word is only reviewable with the audio it
  // came from: the episode heading is the link back to that audio.
  const grouped = useMemo(() => {
    const groups = new Map<string, { episode: EpisodeVocabulary; words: SavedWord[] }>();
    for (const row of filtered) {
      const group = groups.get(row.episode.id) ?? { episode: row.episode, words: [] };
      group.words.push(row.word);
      groups.set(row.episode.id, group);
    }
    return [...groups.values()];
  }, [filtered]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1100px] px-5 pb-16 sm:px-8 lg:px-12">
        <PairNav
          active="words"
          listCount={listCount}
          pair={pair}
          wordCount={rows === null ? null : rows.length}
        />

        <header className="pb-8 pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Your vocabulary
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.05] tracking-[-0.045em] sm:text-5xl">
            Every word, with the sentence it was said in.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            A word saved from an episode keeps the line it was spoken in, who said it and when — so
            you can review by ear instead of by flashcard. Stored on this device only.
          </p>
        </header>

        {isSample && <SampleNotice />}

        <div className="relative mt-8">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search saved words"
            className="h-12 rounded-full pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a word, a meaning or a line"
            value={query}
          />
        </div>

        {rows === null ? (
          <p className="py-10 text-sm text-muted-foreground">Reading this device…</p>
        ) : grouped.length === 0 ? (
          <p className="py-12 text-sm text-muted-foreground">
            {query.trim()
              ? `Nothing saved matches “${query.trim()}”.`
              : 'No words saved under this pair yet.'}
          </p>
        ) : (
          <div className="mt-10 space-y-10">
            {grouped.map((group) => (
              <section key={group.episode.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/70 pb-3">
                  <h2 className="font-serif text-2xl tracking-[-0.03em]">
                    <Link className="hover:underline" href={`${home}/episode/${group.episode.id}`}>
                      {group.episode.episodeTitle}
                    </Link>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {group.episode.showTitle} · {group.episode.level} · {group.words.length}{' '}
                    {group.words.length === 1 ? 'word' : 'words'}
                  </p>
                </div>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {group.words.map((word) => (
                    <WordCard key={`${group.episode.id}-${word.term}`} word={word} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <Link
          className="mt-14 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition hover:bg-foreground/85"
          href={home}
        >
          <Sparkles className="size-4" />
          Find another episode
        </Link>
      </div>
    </main>
  );
}

function SampleNotice() {
  return (
    <div className="rounded-[22px] border border-dashed border-border bg-secondary/40 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        Sample vocabulary
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        You have not saved a word yet, so these are real vocabulary entries from the episodes below,
        shown as if you had. Nothing here has been written to this device. Save a word inside any
        episode and it replaces this immediately.
      </p>
    </div>
  );
}

function WordCard({ word }: { word: SavedWord }) {
  return (
    <li className="rounded-[22px] border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        {/* `term` is a word of the language being learned and `meaning` is
            written in the learner's own — they are different languages in the
            same card, so each carries its own `lang`. Without it a screen
            reader reads a Mandarin term with an English voice. */}
        <h3 className="font-serif text-2xl tracking-[-0.03em]" lang={word.learning}>
          {word.term}
        </h3>
        {word.timestampMs !== undefined && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <AudioLines className="size-3.5" />
            {formatPosition(word.timestampMs / 1000)}
          </span>
        )}
      </div>
      {word.meaning && (
        <p className="mt-1.5 text-sm text-muted-foreground" lang={word.speaks}>
          {word.meaning}
        </p>
      )}
      <blockquote className="mt-4 border-l-2 border-border pl-3 text-sm leading-6" lang={word.learning}>
        <Quote className="mb-1 size-3.5 text-muted-foreground" aria-hidden="true" />
        <Sentence sentence={word.sentence} term={word.term} />
      </blockquote>
      {word.speaker && (
        <p className="mt-2 pl-3 text-xs text-muted-foreground">— {word.speaker}</p>
      )}
    </li>
  );
}

/**
 * The sentence with the term marked inside it.
 *
 * A plain string match, and deliberately no more: an inflected or separated
 * form simply does not highlight, which reads as an ordinary sentence. Guessing
 * at stems would put the mark on the wrong characters, and in Mandarin — where
 * there are no word boundaries to anchor to — that is a lot of wrong marks.
 */
function Sentence({ sentence, term }: { sentence: string; term: string }) {
  const at = sentence.indexOf(term);
  if (at < 0) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, at)}
      <mark className="rounded bg-primary/15 px-0.5 text-foreground">{term}</mark>
      {sentence.slice(at + term.length)}
    </>
  );
}
