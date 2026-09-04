'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bookmark,
  BookOpenText,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gauge,
  Headphones,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EpisodeDetail } from '@/lib/catalogue';
import { pairPath, type LanguagePair } from '@/lib/language';
import { createSavedWord, readSavedWords, type SavedWord } from '@/lib/saved-words';

function TranscriptLine({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const [before, after] = text.split(highlight);
  return <>{before}<mark className="rounded bg-[#f5d8ad] px-1 text-inherit">{highlight}</mark>{after}</>;
}

export function EpisodeLearning({ episode, pair }: { episode: EpisodeDetail; pair: LanguagePair }) {
  const home = pairPath(pair);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [demoProgress, setDemoProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [complete, setComplete] = useState(false);
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  /**
   * Off by default. The product's thesis is that a learner follows an episode
   * by ear; a native-language line permanently under every cue is read instead
   * of heard. It is here for the line they could not get, not for all of them.
   */
  const [showTranslation, setShowTranslation] = useState(false);

  /**
   * Progress is per pair, not per episode.
   *
   * The same episode under `en → en` and under `zh-Hant → en` is two different
   * lessons: the glosses a learner saved are written in their own language, and
   * merging the two would show a Chinese speaker English definitions they never
   * saved. `legacyStorageKey` is the key used before pairs existed — only an
   * `en → en` build ever wrote it, so only that pair reads it, once, to carry
   * an existing learner's words forward instead of silently starting them over.
   */
  const storageKey = `discopod-progress-${pair.speaks}-${pair.learning}-${episode.id}`;
  const legacyStorageKey =
    pair.speaks === 'en' && pair.learning === 'en' ? `tuned-progress-${episode.id}` : null;
  const hasAudio = Boolean(episode.audioSrc);
  const progress = hasAudio && audioDuration ? (currentTime / audioDuration) * 100 : demoProgress;
  const activeTranscriptIndex = useMemo(() => {
    let active = 0;
    episode.transcript.forEach((line, index) => {
      if ((line.seconds ?? 0) <= currentTime) active = index;
    });
    return active;
  }, [currentTime, episode.transcript]);

  // No toggle when there is nothing to toggle: an `en → en` pair has no
  // translations at all, and a control that reveals nothing is a broken one.
  const hasTranslations = episode.transcript.some((line) => Boolean(line.translation));

  const correctCount = episode.questions.filter((question, index) => answers[index] === question.answer).length;
  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return '00:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const cycleSpeed = () => {
    const next = speed === 0.75 ? 1 : speed === 1 ? 1.25 : 0.75;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const togglePlayback = async () => {
    if (!audioRef.current) {
      setPlaying((current) => !current);
      return;
    }
    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audioRef.current.pause();
    }
  };

  const seekTo = (seconds: number) => {
    if (!audioRef.current) {
      setDemoProgress(Math.min(100, Math.max(0, seconds)));
      return;
    }
    const next = Math.min(audioRef.current.duration || seconds, Math.max(0, seconds));
    audioRef.current.currentTime = next;
    setCurrentTime(next);
  };

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored =
          window.localStorage.getItem(storageKey) ??
          (legacyStorageKey ? window.localStorage.getItem(legacyStorageKey) : null);
        if (stored) {
          const value = JSON.parse(stored) as { currentTime?: number; complete?: boolean; savedWords?: unknown; answers?: Record<number, number>; checked?: boolean };
          setCurrentTime(value.currentTime ?? 0);
          setComplete(Boolean(value.complete));
          // Words saved before this stored bare terms; readSavedWords rebuilds
          // their sentence, speaker and timestamp rather than dropping them.
          setSavedWords(readSavedWords(pair, value.savedWords, episode.id, episode.vocabulary));
          setAnswers(value.answers ?? {});
          setChecked(Boolean(value.checked));
        }
      } catch {
        // A private browser session can reject storage; the lesson still works.
      }
      setHydrated(true);
    });
  }, [episode.id, episode.vocabulary, legacyStorageKey, pair, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ currentTime, complete, savedWords, answers, checked }));
    } catch {
      // Progress persistence is an enhancement, not a playback requirement.
    }
  }, [answers, checked, complete, currentTime, hydrated, savedWords, storageKey]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8 lg:px-12">
        <header className="flex h-20 items-center justify-between border-b border-border/70">
          <Link className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]" href={home}>
            <span className="grid size-9 place-items-center rounded-full bg-foreground text-background"><Headphones className="size-[18px]" /></span>
            <span className="text-xl">DiscoPod</span>
          </Link>
          <Link className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground" href={home}><ArrowLeft className="size-4" />Back to discover</Link>
        </header>

        <section className="grid gap-8 py-10 lg:grid-cols-[360px_1fr] lg:items-center lg:py-14">
          <div className={`${episode.tone} ${episode.ink} relative aspect-square overflow-hidden rounded-[28px] p-7 shadow-[0_24px_70px_rgba(48,42,35,0.12)]`}>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-60">{episode.showTitle}</span>
            <h1 className="mt-12 max-w-[9ch] font-serif text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.9] tracking-[-0.055em]">{episode.episodeTitle}</h1>
            <span className="absolute bottom-6 left-6 rounded-full bg-white/55 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">{episode.level} · {episode.cefr}</span>
            <span className="absolute -bottom-12 -right-10 size-40 rounded-full border-[24px] border-white/25" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Listening lesson · {episode.topic}</p>
              {episode.publisherTranscript && <span className="rounded-full bg-[#e4f0e9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#416b55]">Real audio + transcript</span>}
            </div>
            <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.045em] sm:text-6xl">Learn from a real conversation.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{episode.learningGoal}</p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2"><Clock3 className="size-4" />{episode.duration}</span>
              <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2"><Gauge className="size-4" />{episode.speed}</span>
              <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2"><BookOpenText className="size-4" />{episode.newWords} new words</span>
            </div>
            {episode.sourceUrl && <p className="mt-5 text-xs leading-5 text-muted-foreground">Audio and transcript: <a className="font-semibold text-foreground underline decoration-border underline-offset-4" href={episode.sourceUrl} rel="noreferrer" target="_blank">{episode.sourceLabel}</a>. Used with credit for language learning.</p>}
          </div>
        </section>

        <section className="rounded-[26px] border border-border bg-card p-5 shadow-[0_14px_45px_rgba(48,42,35,0.06)] sm:p-7" aria-label="Episode player">
          {episode.audioSrc && (
            <audio
              ref={audioRef}
              src={episode.audioSrc}
              preload="metadata"
              onLoadedMetadata={(event) => {
                setAudioDuration(event.currentTarget.duration);
                event.currentTarget.playbackRate = speed;
                if (currentTime > 0 && currentTime < event.currentTarget.duration) event.currentTarget.currentTime = currentTime;
              }}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setComplete(true); }}
            >
              <track default kind="captions" src="/audio/voa-lesson-1-welcome.vtt" srcLang="en" label="English" />
            </audio>
          )}
          <div className="flex items-center gap-4 sm:gap-5">
            <Button className="size-14 shrink-0 rounded-full" size="icon" aria-label={playing ? 'Pause lesson' : 'Play lesson'} onClick={togglePlayback}>{playing ? <Pause className="fill-current" /> : <Play className="ml-1 fill-current" />}</Button>
            <div className="flex-1">
              <button className="block h-5 w-full py-2" type="button" aria-label="Seek episode" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const ratio = (event.clientX - rect.left) / rect.width; if (hasAudio) seekTo(ratio * audioDuration); else setDemoProgress(Math.round(ratio * 100)); }}>
                <span className="block h-1.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></span>
              </button>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{hasAudio ? formatTime(currentTime) : `${Math.round(progress)}%`}</span><span>{hasAudio && audioDuration ? formatTime(audioDuration) : episode.duration}</span></div>
            </div>
            <Button variant="ghost" size="icon" className="hidden rounded-full md:inline-flex" aria-label="Replay 10 seconds" onClick={() => seekTo(hasAudio ? currentTime - 10 : demoProgress - 10)}><SkipBack /></Button>
            <Button variant="ghost" size="icon" className="hidden rounded-full md:inline-flex" aria-label="Skip 10 seconds" onClick={() => seekTo(hasAudio ? currentTime + 10 : demoProgress + 10)}><SkipForward /></Button>
            <Button variant="outline" className="hidden rounded-full sm:inline-flex" onClick={cycleSpeed}>{speed}×</Button>
            <Button variant={complete ? 'secondary' : 'outline'} className="hidden rounded-full lg:inline-flex" onClick={() => setComplete((current) => !current)}>{complete ? <Check /> : <CheckCircle2 />}{complete ? 'Completed' : 'Mark complete'}</Button>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 sm:hidden"><button className="text-xs font-semibold" onClick={cycleSpeed} type="button">Speed {speed}×</button><button className="flex items-center gap-1.5 text-xs font-semibold" onClick={() => setComplete((current) => !current)} type="button">{complete && <Check className="size-3.5" />}{complete ? 'Completed' : 'Mark complete'}</button></div>
          {hasAudio && <p className="mt-4 border-t border-border/70 pt-4 text-xs text-muted-foreground">Your listening position, saved words, and quiz answers stay on this device.</p>}
        </section>

        <Tabs defaultValue="transcript" className="mt-8">
          <TabsList variant="line" className="h-auto w-full justify-start gap-7 border-b border-border p-0 sm:gap-10">
            <TabsTrigger value="transcript" className="h-auto flex-none px-0 pb-4">Transcript</TabsTrigger>
            <TabsTrigger value="vocabulary" className="h-auto flex-none px-0 pb-4">Vocabulary <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{episode.vocabulary.length}</span></TabsTrigger>
            <TabsTrigger value="practice" className="h-auto flex-none px-0 pb-4">Practice</TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-[24px] border border-border bg-card px-5 py-2 sm:px-8">
              {hasTranslations && (
                <div className="flex items-center justify-end border-b border-border/70 py-3">
                  <button type="button" onClick={() => setShowTranslation((value) => !value)} aria-pressed={showTranslation} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                    {showTranslation ? 'Hide translation' : 'Show translation'}
                  </button>
                </div>
              )}
              {episode.transcript.map((line, index) => (
                <button key={`${line.time}-${index}`} type="button" onClick={() => seekTo(hasAudio ? (line.seconds ?? 0) : Math.min(95, 8 + index * 18))} className={`group -mx-2 grid w-[calc(100%+1rem)] grid-cols-[58px_1fr] rounded-xl border-b border-border/70 px-2 py-5 text-left transition last:border-0 sm:grid-cols-[74px_1fr] ${hasAudio && activeTranscriptIndex === index ? 'bg-secondary/75' : 'hover:bg-secondary/40'}`}>
                  <span className="pt-1 text-xs font-semibold text-primary">{line.time}</span>
                  <span className="text-base leading-7 transition group-hover:text-primary sm:text-lg sm:leading-8">{line.speaker && <strong className="mr-2 text-sm">{line.speaker}</strong>}<TranscriptLine text={line.text} highlight={line.highlight} />{showTranslation && line.translation && <span className="mt-1 block text-sm leading-6 text-muted-foreground">{line.translation}</span>}</span>
                </button>
              ))}
            </div>
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-[22px] bg-secondary/60 p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Learning focus</p><h3 className="mt-2 font-serif text-2xl">{episode.learningGoal}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Don&apos;t stop at every unfamiliar word. First listen for the speaker&apos;s main idea, then replay each section.</p></div>
              <div className="rounded-[22px] border border-border bg-card p-5"><div className="flex items-center gap-2"><Volume2 className="size-4 text-primary" /><h3 className="font-semibold">Listening tip</h3></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Tap any transcript line to jump to that part of the episode. The current line follows the audio.</p></div>
            </aside>
          </TabsContent>

          <TabsContent value="vocabulary" className="py-8">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">From this episode</p><h3 className="mt-1 font-serif text-3xl tracking-[-0.035em]">Words worth keeping</h3></div><p className="text-sm text-muted-foreground">{savedWords.length} saved to your word list</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              {episode.vocabulary.map((word) => {
                const isSaved = savedWords.some((item) => item.term === word.term);
                const heard = word.occurrence;
                return (
                  <article key={word.term} className="rounded-[22px] border border-border bg-card p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-baseline gap-2"><h4 className="font-serif text-2xl">{word.term}</h4><span className="text-xs italic text-muted-foreground">{word.type}</span></div>
                        <p className="mt-3 text-sm leading-6">{word.meaning}</p>
                      </div>
                      <Button
                        variant={isSaved ? 'secondary' : 'outline'}
                        size="icon"
                        className="rounded-full"
                        aria-label={`${isSaved ? 'Remove' : 'Save'} ${word.term}`}
                        onClick={() => setSavedWords((current) => (isSaved ? current.filter((item) => item.term !== word.term) : [...current, createSavedWord(pair, episode.id, word)]))}
                      >
                        {isSaved ? <Check /> : <Bookmark />}
                      </Button>
                    </div>

                    {/* The line as it was said, when the term can be located in the
                        transcript — that sentence, speaker and timestamp are what the
                        word keeps when it is saved. When it cannot, fall back to the
                        authored example and say so, rather than passing the example
                        off as something the learner will hear. The fallback claims
                        only that the search failed, not that the word is absent. */}
                    <p className="mt-5 border-l-2 border-primary/40 pl-3 text-sm italic leading-6 text-muted-foreground">“{heard?.sentence ?? word.example}”</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                      {heard ? (
                        <>
                          {heard.speaker && <span className="font-semibold text-foreground">{heard.speaker}</span>}
                          <button type="button" onClick={() => seekTo(heard.seconds)} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-semibold transition hover:bg-secondary/70">
                            <Play className="size-3 fill-current" />Hear it at {formatTime(heard.seconds)}
                          </button>
                        </>
                      ) : (
                        <span>Example sentence — we couldn’t locate this word in the transcript.</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="practice" className="py-8">
            <div className="mx-auto max-w-3xl">
              <div className="mb-7 rounded-[22px] bg-foreground p-6 text-background sm:p-8"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-background/60"><Sparkles className="size-4" />Quick check</div><h3 className="mt-3 font-serif text-3xl tracking-[-0.035em]">What did you understand?</h3><p className="mt-2 text-sm leading-6 text-background/65">Choose one answer for each question. You can retry as many times as you like.</p></div>
              <div className="space-y-5">
                {episode.questions.map((question, questionIndex) => (
                  <fieldset key={question.prompt} className="rounded-[22px] border border-border bg-card p-5 sm:p-6">
                    <legend className="px-1 font-semibold"><span className="mr-2 text-primary">{questionIndex + 1}.</span>{question.prompt}</legend>
                    <div className="mt-5 grid gap-2">
                      {question.options.map((option, optionIndex) => {
                        const selected = answers[questionIndex] === optionIndex;
                        const correct = checked && optionIndex === question.answer;
                        const wrong = checked && selected && optionIndex !== question.answer;
                        return <button key={option} type="button" onClick={() => { setAnswers((current) => ({ ...current, [questionIndex]: optionIndex })); setChecked(false); }} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${correct ? 'border-[#76a58c] bg-[#e4f0e9]' : wrong ? 'border-[#d47b68] bg-[#f8e7e2]' : selected ? 'border-foreground bg-secondary' : 'border-border hover:bg-secondary/55'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${selected || correct ? 'border-foreground bg-foreground text-background' : 'border-border'}`}>{String.fromCharCode(65 + optionIndex)}</span>{option}{correct && <Check className="ml-auto size-4" />}</button>;
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
              {checked ? <div className="mt-5 flex items-center justify-between rounded-[18px] bg-secondary p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><Lightbulb className="size-4" /></span><p className="text-sm font-semibold">You got {correctCount} of {episode.questions.length} correct.</p></div><Button variant="ghost" className="rounded-full" onClick={() => { setAnswers({}); setChecked(false); }}><RotateCcw />Try again</Button></div> : <Button className="mt-5 h-11 rounded-full px-6" disabled={Object.keys(answers).length !== episode.questions.length} onClick={() => setChecked(true)}>Check answers<CheckCircle2 /></Button>}
            </div>
          </TabsContent>
        </Tabs>

        <section className="mt-12 flex flex-col items-start justify-between gap-5 rounded-[26px] bg-secondary/60 p-6 sm:flex-row sm:items-center sm:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Keep learning</p><h3 className="mt-2 font-serif text-3xl">Ready for another episode?</h3></div><div className="flex gap-2"><Link className="grid size-11 place-items-center rounded-full border border-border bg-card" href={`${home}/episode/${episode.previousId}`} aria-label="Previous lesson"><ChevronLeft /></Link><Link className="flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background" href={`${home}/episode/${episode.nextId}`}>Next lesson<ChevronRight className="size-4" /></Link></div></section>
      </div>
    </main>
  );
}
