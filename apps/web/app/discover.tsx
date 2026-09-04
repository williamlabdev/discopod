'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpenText,
  Check,
  Clock3,
  Gauge,
  Headphones,
  Menu,
  Pause,
  Play,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LEARNING_LEVELS, type DiscoverCatalogue, type EpisodeCard, type LearningLevel } from '@/lib/catalogue';

type WebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(input: unknown): unknown;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

const LEVEL_COPY: Record<LearningLevel, { range: string; note: string }> = {
  Beginner: { range: 'A1–A2', note: 'Clear, everyday language' },
  Intermediate: { range: 'B1–B2', note: 'Natural speech with support' },
  Advanced: { range: 'C1–C2', note: 'Nuanced, fast-paced ideas' },
};

const learningLevels = LEARNING_LEVELS.map((name) => ({ name, ...LEVEL_COPY[name] }));

function searchableText(card: EpisodeCard) {
  return [card.showTitle, card.publisher, card.topic, card.episodeTitle, card.description, card.level, card.cefr, ...card.tags]
    .join(' ')
    .toLowerCase();
}

export function Discover({ catalogue }: { catalogue: DiscoverCatalogue }) {
  const [query, setQuery] = useState('');
  const [activeInterest, setActiveInterest] = useState('All');
  const [activeLevel, setActiveLevel] = useState<LearningLevel>('Beginner');
  const [saved, setSaved] = useState<string[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // The API already ranked and filtered by level, per level, at build time.
  // Interest and free text narrow that list; they never reorder it.
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return catalogue.byLevel[activeLevel].filter((card) => {
      const matchesInterest = activeInterest === 'All' || card.topic === activeInterest;
      const matchesQuery = !normalized || searchableText(card).includes(normalized);
      return matchesInterest && matchesQuery;
    });
  }, [activeInterest, activeLevel, catalogue, query]);

  const interests = useMemo(() => ['All', ...catalogue.topics], [catalogue.topics]);
  const everyCard = useMemo(() => LEARNING_LEVELS.flatMap((level) => catalogue.byLevel[level]), [catalogue]);

  const visible = showAll ? filtered : filtered.slice(0, 3);

  const toggleSaved = (id: string) => {
    setSaved((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const clearFilters = () => {
    setQuery('');
    setActiveInterest('All');
    setActiveLevel('Beginner');
    setShowAll(false);
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: WebMcpTool) => {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    };

    register({
      name: 'search_podcasts',
      title: 'Search podcasts',
      description: 'Search the DiscoPod language-learning catalog by topic and transcript difficulty.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 1 },
          level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
        },
        required: ['query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const { query: value, level } = input as { query?: unknown; level?: unknown };
        if (typeof value !== 'string' || !value.trim()) throw new Error('query must be a non-empty string');
        if (level !== undefined && !learningLevels.some((item) => item.name === level)) throw new Error('level must be Beginner, Intermediate, or Advanced');
        const nextQuery = value.trim();
        const nextLevel = (typeof level === 'string' ? level : 'Beginner') as LearningLevel;
        const matches = catalogue.byLevel[nextLevel].filter((card) => searchableText(card).includes(nextQuery.toLowerCase()));
        setActiveInterest('All');
        setActiveLevel(nextLevel);
        setQuery(nextQuery);
        setShowAll(true);
        return { query: nextQuery, level: nextLevel, resultCount: matches.length, titles: matches.map((card) => card.showTitle) };
      },
    });

    register({
      name: 'save_podcast',
      title: 'Save podcast',
      description: 'Save one podcast from the DiscoPod catalog to the listener library.',
      inputSchema: {
        type: 'object',
        // Episode ids come from the API and are opaque strings; they were
        // integers only while the catalogue lived in this app.
        properties: { podcastId: { type: 'string', minLength: 1 } },
        required: ['podcastId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const id = (input as { podcastId?: unknown })?.podcastId;
        const card = typeof id === 'string' ? everyCard.find((item) => item.id === id) : undefined;
        if (!card) throw new Error('podcastId was not found');
        setSaved((current) => (current.includes(card.id) ? current : [...current, card.id]));
        return { saved: true, podcastId: card.id, title: card.showTitle };
      },
    });

    return () => lifecycle.abort();
  }, [catalogue, everyCard]);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
        <header className="relative flex h-20 items-center justify-between border-b border-border/70">
          <a className="flex items-center gap-2.5 font-semibold tracking-[-0.03em]" href="#discover">
            <span className="grid size-9 place-items-center rounded-full bg-foreground text-background"><Headphones className="size-[18px]" /></span>
            <span className="text-xl">DiscoPod</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
            <a className="text-foreground" href="#discover">Discover</a>
            <a className="transition-colors hover:text-foreground" href="#library">My learning list <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{saved.length}</span></a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden h-10 rounded-full border-foreground/15 bg-transparent px-5 sm:inline-flex">Sign in</Button>
            <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Toggle navigation" onClick={() => setMobileNavOpen((open) => !open)}>
              {mobileNavOpen ? <X /> : <Menu />}
            </Button>
          </div>
          {mobileNavOpen && (
            <nav className="absolute left-0 right-0 top-[70px] z-30 flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-xl md:hidden" aria-label="Mobile navigation">
              <a className="rounded-xl px-4 py-3 font-medium hover:bg-secondary" href="#discover" onClick={() => setMobileNavOpen(false)}>Discover</a>
              <a className="rounded-xl px-4 py-3 font-medium hover:bg-secondary" href="#library" onClick={() => setMobileNavOpen(false)}>My learning list · {saved.length} saved</a>
              <Button className="mt-1 h-11 rounded-xl">Sign in</Button>
            </nav>
          )}
        </header>

        <section id="discover" className="grid gap-12 pb-14 pt-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:pt-20">
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><Sparkles className="size-3.5 text-primary" />Learn through real conversations</p>
            <h1 className="max-w-3xl font-serif text-[clamp(3rem,7vw,6.8rem)] leading-[0.9] tracking-[-0.055em]">Podcasts at <em className="font-normal text-primary">your level.</em></h1>
          </div>
          <div className="pb-1">
            <p className="mb-6 max-w-md text-base leading-7 text-muted-foreground">Choose your English level. We analyze each transcript so every episode feels challenging—not overwhelming.</p>
            <form className="relative" onSubmit={(event) => { event.preventDefault(); setShowAll(true); }}>
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search learning podcasts by topic" className="h-14 rounded-full border-foreground/15 bg-card pl-12 pr-28 text-base shadow-sm placeholder:text-muted-foreground/75" placeholder="What do you want to learn about?" />
              <Button type="submit" className="absolute right-1.5 top-1.5 h-11 rounded-full px-5">Explore<ArrowUpRight /></Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">Every episode includes a transcript and vocabulary support.</p>
          </div>
        </section>

        <section aria-labelledby="level-heading" className="mb-8 rounded-[26px] border border-border bg-card p-3 shadow-[0_12px_35px_rgba(48,42,35,0.05)]">
          <div className="grid gap-2 lg:grid-cols-[220px_repeat(3,1fr)]">
            <div className="flex items-center px-4 py-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">Step 1</p><h2 id="level-heading" className="mt-1 font-serif text-2xl tracking-[-0.03em]">Choose your level</h2></div>
            </div>
            {learningLevels.map((level) => {
              const active = activeLevel === level.name;
              return (
                <button key={level.name} type="button" aria-pressed={active} onClick={() => setActiveLevel(level.name)} className={`flex items-center justify-between rounded-[18px] border p-4 text-left transition ${active ? 'border-foreground bg-foreground text-background' : 'border-transparent bg-secondary/55 hover:border-border'}`}>
                  <div><span className="font-semibold">{level.name}</span><p className={`mt-1 text-xs ${active ? 'text-background/65' : 'text-muted-foreground'}`}>{level.note}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-background/15' : 'bg-card'}`}>{level.range}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="interests-heading" className="border-t border-border/70 pt-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id="interests-heading" className="mr-3 text-sm font-medium">Browse by interest</h2>
            {interests.map((interest) => {
              const active = activeInterest === interest;
              return <button aria-pressed={active} onClick={() => { setActiveInterest(interest); setShowAll(false); }} className={`rounded-full border px-4 py-2 text-sm transition ${active ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:border-foreground/35'}`} key={interest} type="button">{interest}</button>;
            })}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="results-heading">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{filtered.length} {activeLevel.toLowerCase()} {filtered.length === 1 ? 'match' : 'matches'}</p>
              <h2 id="results-heading" className="font-serif text-3xl tracking-[-0.035em]">{query ? `“${query}” at ${activeLevel.toLowerCase()} level` : activeInterest !== 'All' ? `${activeInterest} for ${activeLevel.toLowerCase()} learners` : `${activeLevel} listening practice`}</h2>
            </div>
            {filtered.length > 3 && <button className="hidden shrink-0 text-sm font-medium underline decoration-border underline-offset-4 sm:block" onClick={() => setShowAll((current) => !current)} type="button">{showAll ? 'Show less' : `See all ${filtered.length}`}</button>}
          </div>

          {visible.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((card, index) => {
                const isPlaying = playing === card.id;
                const isSaved = saved.includes(card.id);
                return (
                  <article className="group rounded-[26px] border border-border bg-card p-3 shadow-[0_14px_40px_rgba(48,42,35,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(48,42,35,0.1)]" key={card.id}>
                    <div className={`${card.tone} ${card.ink} relative aspect-[4/3] overflow-hidden rounded-[18px] p-5`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.12em] opacity-60">{card.topic}</span>{card.publisherTranscript && <span className="rounded-full bg-white/55 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em]">Real lesson</span>}</div>
                        <button aria-label={`${isSaved ? 'Remove' : 'Save'} ${card.showTitle}`} aria-pressed={isSaved} className="grid size-9 place-items-center rounded-full bg-white/35 backdrop-blur-sm transition hover:bg-white/55" onClick={() => toggleSaved(card.id)} type="button">
                          {isSaved ? <Check className="size-4" /> : <Bookmark className="size-4" />}
                        </button>
                      </div>
                      <p className="mt-4 max-w-[9ch] font-serif text-[clamp(1.7rem,3vw,2.5rem)] leading-[0.93] tracking-[-0.05em]">{card.showTitle}</p>
                      <span className="absolute bottom-4 left-4 rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">{card.level} · {card.cefr}</span>
                      <Button aria-label={`${isPlaying ? 'Pause' : 'Play'} ${card.showTitle}`} onClick={() => setPlaying(isPlaying ? null : card.id)} className="absolute bottom-4 right-4 size-12 rounded-full bg-[#24211f] text-white hover:bg-[#24211f]/85" size="icon">
                        {isPlaying ? <Pause className="fill-current" /> : <Play className="ml-0.5 fill-current" />}
                      </Button>
                      <span className="absolute -bottom-10 -left-8 size-28 rounded-full border-[18px] border-white/30" aria-hidden="true" />
                      {index % 3 === 2 && <span className="absolute right-16 top-12 h-20 w-px rotate-[28deg] bg-current opacity-20" aria-hidden="true" />}
                    </div>
                    <div className="px-2 pb-2 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><h3 className="font-semibold tracking-[-0.02em]">{card.showTitle}</h3><p className="mt-0.5 text-sm text-muted-foreground">{card.publisher}</p></div>
                        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground" title={card.fitReason}>{card.suitability}% fit</span>
                      </div>
                      <p className="mt-4 text-sm font-medium leading-5">{card.episodeTitle}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{card.description}</p>
                      <div className="mt-4 rounded-xl bg-secondary/55 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">Why it fits your level</p>
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{card.levelReason}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Gauge className="size-3.5" />{card.speed}</span>
                          <span className="flex items-center gap-1.5"><BookOpenText className="size-3.5" />{card.newWords} new words</span>
                          <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{card.duration}</span>
                        </div>
                      </div>
                      <a className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold transition hover:border-foreground/25 hover:bg-secondary" href={`/episode/${card.id}`}>Start lesson<ArrowRight className="size-4" /></a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-[26px] border border-dashed border-border bg-card/60 px-6 text-center">
              <div><span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-secondary"><Search className="size-5" /></span><h3 className="font-serif text-2xl">No {activeLevel.toLowerCase()} match yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Try a broader topic or choose another learning level.</p><Button onClick={clearFilters} variant="outline" className="mt-5 rounded-full px-5">Reset filters</Button></div>
            </div>
          )}
          {filtered.length > 3 && <Button variant="outline" className="mt-5 w-full rounded-full sm:hidden" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Show less' : `See all ${filtered.length}`}</Button>}
        </section>

        <section className="mt-20 border-y border-border py-10" aria-labelledby="difficulty-heading">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_repeat(3,1fr)] lg:items-start">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Transcript analyzed</p><h2 id="difficulty-heading" className="mt-2 font-serif text-3xl tracking-[-0.035em]">Difficulty you can trust</h2><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">We classify the episode itself—not the show—so the level reflects the words you will actually hear.</p></div>
            <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><Gauge className="size-4" /></span><div><h3 className="font-semibold">Speech pace</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">Words per minute and pauses between ideas.</p></div></div>
            <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><BookOpenText className="size-4" /></span><div><h3 className="font-semibold">Vocabulary load</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">Uncommon words, idioms, and technical terms.</p></div></div>
            <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><Sparkles className="size-4" /></span><div><h3 className="font-semibold">Sentence complexity</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">Grammar patterns and how ideas connect.</p></div></div>
          </div>
        </section>

        <section id="library" className="mt-20 overflow-hidden rounded-[30px] bg-foreground text-background">
          <div className="grid lg:grid-cols-[1fr_1.25fr]">
            <div className="p-8 sm:p-12 lg:p-14">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-background/55">Your learning list</p>
              <h2 className="max-w-md font-serif text-4xl leading-[1.03] tracking-[-0.045em] sm:text-5xl">A better way to practice listening.</h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-background/65">Save episodes for your next study session. Every listen comes with a readable transcript and vocabulary help. You have {saved.length} {saved.length === 1 ? 'lesson' : 'lessons'} waiting.</p>
              <Button className="mt-8 h-11 rounded-full bg-background px-5 text-foreground hover:bg-background/85">Open my learning list<ArrowRight /></Button>
            </div>
            <div className="relative min-h-72 overflow-hidden bg-[#ff895d] p-5 sm:p-8">
              <Image className="h-full min-h-64 w-full rounded-[22px] object-cover object-center shadow-2xl" src="/og.png" width={1733} height={908} priority alt="DiscoPod language-learning artwork with headphones and transcript-inspired sound waves" />
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DiscoPod. Learn by listening.</p>
          <div className="flex gap-5">
            {['About', 'Privacy', 'Feedback'].map((label) => (
              <button className="transition hover:text-foreground" key={label} type="button">{label}</button>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
