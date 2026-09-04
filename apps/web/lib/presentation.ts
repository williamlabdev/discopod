/**
 * Presentation for catalogue data.
 *
 * The API deliberately does not return colours. A card palette is a decision
 * about this web app's visual identity, not a fact about an episode, and a
 * second client (a mobile app, a widget) would want its own. So the palette
 * lives here, keyed by show id, and the API stays a domain service.
 *
 * Show ids come from `slug(show.title)` in the API's seed loader.
 */

type Palette = { tone: string; ink: string };

const PALETTE: Record<string, Palette> = {
  'let-s-learn-english': { tone: 'bg-[#f7b267]', ink: 'text-[#342115]' },
  'how-i-built-this': { tone: 'bg-[#ff895d]', ink: 'text-[#2b1e1a]' },
  'hidden-brain': { tone: 'bg-[#9bc7b0]', ink: 'text-[#173028]' },
  '99-invisible': { tone: 'bg-[#aab8e8]', ink: 'text-[#1d2440]' },
  'search-engine': { tone: 'bg-[#f2c766]', ink: 'text-[#2f2918]' },
  ologies: { tone: 'bg-[#d6a7cd]', ink: 'text-[#3f2037]' },
  'articles-of-interest': { tone: 'bg-[#98c9d7]', ink: 'text-[#17303a]' },
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

/** "48 min" / "30 sec" — the same shape the cards showed before the cut-over. */
export function formatDuration(seconds: number): string {
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds} sec`;
}

/**
 * The API reports speech rate as a number. The "≈" the VOA lesson used to carry
 * was hand-written; a measured rate on a 30-second clip is an estimate for every
 * episode, so either all of them hedge or none do. None do.
 */
export function formatSpeechRate(wordsPerMinute: number): string {
  return `${wordsPerMinute} wpm`;
}
