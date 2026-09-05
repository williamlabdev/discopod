/**
 * Presentation for catalogue data.
 *
 * The API deliberately does not return colours. A card palette is a decision
 * about this web app's visual identity, not a fact about an episode, and a
 * second client (a mobile app, a widget) would want its own. So the palette
 * lives here, keyed by show id, and the API stays a domain service.
 *
 * Show ids come from the API's seed loader — `slug(show.title)` for a Latin
 * title, or the row's explicit `showId` where a title cannot produce one. A
 * miss here is not a bug: `paletteFor` hashes to a stable fallback, so a show
 * added to the catalogue looks deliberate before anyone chooses its colour.
 */

import type { SpeechRate } from './catalog-api';
import { interfaceCopy } from './interface-copy';
import type { LanguageTag } from './language';

type Palette = { tone: string; ink: string };

const PALETTE: Record<string, Palette> = {
  'let-s-learn-english': { tone: 'bg-[#f7b267]', ink: 'text-[#342115]' },
  'how-i-built-this': { tone: 'bg-[#ff895d]', ink: 'text-[#2b1e1a]' },
  'hidden-brain': { tone: 'bg-[#9bc7b0]', ink: 'text-[#173028]' },
  '99-invisible': { tone: 'bg-[#aab8e8]', ink: 'text-[#1d2440]' },
  'search-engine': { tone: 'bg-[#f2c766]', ink: 'text-[#2f2918]' },
  ologies: { tone: 'bg-[#d6a7cd]', ink: 'text-[#3f2037]' },
  'articles-of-interest': { tone: 'bg-[#98c9d7]', ink: 'text-[#17303a]' },
  'zh-wikipedia-spoken': { tone: 'bg-[#7fb0a8]', ink: 'text-[#122b28]' },
};

/** Deterministic fallback, so an ingested show still gets a stable colour. */
const FALLBACKS: Palette[] = [
  { tone: 'bg-[#f7b267]', ink: 'text-[#342115]' },
  { tone: 'bg-[#9bc7b0]', ink: 'text-[#173028]' },
  { tone: 'bg-[#aab8e8]', ink: 'text-[#1d2440]' },
  { tone: 'bg-[#d6a7cd]', ink: 'text-[#3f2037]' },
  { tone: 'bg-[#98c9d7]', ink: 'text-[#17303a]' },
];

export function paletteFor(showId: string): Palette {
  const known = PALETTE[showId];
  if (known) return known;

  let hash = 0;
  for (const char of showId) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return FALLBACKS[hash % FALLBACKS.length];
}

/** A compact duration in the learner's interface language. */
export function formatDuration(seconds: number, language: LanguageTag): string {
  const copy = interfaceCopy(language).common;
  if (seconds >= 60) return copy.durationMinutes(Math.round(seconds / 60));
  return copy.durationSeconds(seconds);
}

/**
 * The unit comes from the rate, not from this function. It used to be hard-coded
 * "wpm" here, which was correct only while every episode was English — the same
 * assumption ADR 0004 pulls out of the API's thresholds, and this is the display
 * end of it. On a card the unit reads the same in every learner language, so
 * unlike the ranked reason this needs no per-language renderer.
 *
 * The "≈" the VOA lesson used to carry was hand-written; a measured rate on a
 * 30-second clip is an estimate for every episode, so either all of them hedge
 * or none do. None do.
 */
export function formatSpeechRate(rate: SpeechRate): string {
  return `${rate.value} ${rate.unit}`;
}

/** The number of distinct speakers, in the learner's interface language. */
export function formatVoices(
  speakerCount: number,
  language: LanguageTag,
): string {
  return interfaceCopy(language).common.voices(speakerCount);
}
