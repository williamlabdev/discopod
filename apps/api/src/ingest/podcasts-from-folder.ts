import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { LearningLevel, TocflBand } from '../catalog/catalog.types';

interface Args {
  source: string;
  out: string;
  overlayVi: string;
}

interface Metadata {
  title?: string;
  podcast_title?: string;
  author?: string;
  audio_url?: string;
  page_url?: string;
  source_url?: string;
  published?: string;
  audio_duration_seconds?: number;
}

interface TranscriptSegment {
  start: number;
  end?: number;
  text: string;
  speaker?: string | null;
}

interface TranscriptJson {
  language?: string;
  audio_duration_seconds?: number;
  source?: Metadata;
  segments?: TranscriptSegment[];
}

interface SrtCue {
  startMs: number;
  endMs: number;
  lines: string[];
}

const SHOWS: Record<string, { showId: string; title: string; publisher: string; scriptConversion?: 'manual' }> = {
  '電扶梯走左邊-with-Jacky-Left-Side-Escalator': {
    showId: 'left-side-escalator',
    title: '電扶梯走左邊 with Jacky',
    publisher: 'Jacky Wang',
  },
  '法客電台-BY-法律白話文運動-Plain-Law-Movement': {
    showId: 'plain-law-radio',
    title: '法客電台',
    publisher: '法律白話文運動',
  },
  'TeaTime-Chinese-茶歇中文': {
    showId: 'teatime-chinese',
    title: 'TeaTime Chinese 茶歇中文',
    publisher: 'TeaTime Chinese',
    scriptConversion: 'manual',
  },
  '大人的Small-Talk': {
    showId: 'adult-small-talk',
    title: '大人的 Small Talk',
    publisher: '大人學',
  },
  '馬力歐陪你喝一杯': {
    showId: 'mario-drinks-with-you',
    title: '馬力歐陪你喝一杯',
    publisher: '馬力歐',
  },
  'Learning-Chinese-through-Stories': {
    showId: 'learning-chinese-through-stories',
    title: 'Learning Chinese through Stories',
    publisher: 'Learning Chinese through Stories',
    scriptConversion: 'manual',
  },
};

const SIMPLIFIED_ONLY = [...'说这时会学国语视频车门电觉边东习汉话过进开问'];

function parseArgs(argv: string[]): Args {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) args[item.slice(2)] = argv[++i];
  }
  if (!args.source || !args.out || !args['overlay-vi']) {
    throw new Error('Usage: tsx podcasts-from-folder.ts --source <dir> --out <seed.json> --overlay-vi <overlay.json>');
  }
  return { source: args.source, out: args.out, overlayVi: args['overlay-vi'] };
}

function parseTime(value: string): number {
  const match = /^(\d+):(\d{2}):(\d{2}),(\d{3})$/.exec(value.trim());
  if (!match) throw new Error(`Bad SRT timestamp: ${value}`);
  const [, h, m, s, ms] = match;
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(ms);
}

export function parseSrt(input: string): SrtCue[] {
  return input
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (/^\d+$/.test(lines[0] ?? '')) lines.shift();
      const timing = lines.shift();
      if (!timing) throw new Error(`SRT block without timing: ${block}`);
      const [start, end] = timing.split(/\s+-->\s+/);
      if (!start || !end) throw new Error(`Bad SRT timing line: ${timing}`);
      return { startMs: parseTime(start), endMs: parseTime(end), lines };
    });
}

function cueKey(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function hasSimplifiedOnly(text: string): string | undefined {
  return SIMPLIFIED_ONLY.find((char) => text.includes(char));
}

function countHan(text: string): number {
  return [...text].filter((char) => /[\u3400-\u9fff]/u.test(char)).length;
}

function speechRate(segments: TranscriptSegment[]): number {
  const spoken = segments.filter((segment) => segment.text.trim());
  if (!spoken.length) return 0;
  const chars = spoken.reduce((sum, segment) => sum + countHan(segment.text), 0);
  const start = Math.min(...spoken.map((segment) => segment.start));
  const end = Math.max(...spoken.map((segment) => segment.end ?? segment.start));
  return Math.round(chars / Math.max((end - start) / 60, 1 / 60));
}

function medianPauseMs(segments: TranscriptSegment[]): number {
  const pauses = segments
    .slice(1)
    .map((segment, index) => Math.max(0, (segment.start - (segments[index].end ?? segments[index].start)) * 1000))
    .filter((pause) => pause >= 500)
    .sort((a, b) => a - b);
  return pauses.length ? pauses[Math.floor(pauses.length / 2)] : 0;
}

function speakerCount(segments: TranscriptSegment[]): number {
  const speakers = new Set(segments.map((segment) => segment.speaker).filter(Boolean));
  return Math.max(1, speakers.size || (segments.some((segment) => /[:：]/.test(segment.text)) ? 2 : 1));
}

function rateEpisode(cpm: number, pauseMs: number, speakers: number, showId: string): { level: LearningLevel; tocfl: TocflBand } {
  if (showId === 'learning-chinese-through-stories' || showId === 'teatime-chinese') {
    if (cpm <= 180) return { level: 'Beginner', tocfl: 'Level 1' };
    return { level: 'Intermediate', tocfl: 'Level 2' };
  }
  if (cpm <= 170 && pauseMs >= 900) return { level: 'Beginner', tocfl: 'Level 2' };
  if (cpm <= 235 && speakers <= 2) return { level: 'Intermediate', tocfl: 'Level 3' };
  return { level: 'Advanced', tocfl: 'Level 4' };
}

function firstSentence(text: string): string {
  return text.split(/[。！？.!?]/)[0]?.trim() || text.slice(0, 80).trim();
}

function viLevel(level: LearningLevel, cpm: number, speakers: number): string {
  const label = level === 'Beginner' ? 'dễ hơn' : level === 'Intermediate' ? 'trung cấp' : 'nâng cao';
  return `Xếp mức ${label} dựa trên bản chép lời: khoảng ${cpm} chữ/phút và ${speakers} giọng nói.`;
}

function cueTranslationsByRoundedSecond(cues: SrtCue[]): Map<string, string> {
  const byKey = new Map<string, string>();
  for (const cue of cues) {
    const value = cue.lines.slice(1).join('\n').trim();
    if (!value) continue;
    const key = cueKey(cue.startMs);
    const existing = byKey.get(key);
    byKey.set(key, existing ? `${existing}\n${value}` : value);
  }
  return byKey;
}

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs');
  const seed: unknown[] = [];
  const viOverlay: Record<string, { transcript: Record<string, string> }> = {};
  let nextId = 200;

  for (const showFolder of readdirSync(args.source).sort()) {
    const showPath = join(args.source, showFolder);
    if (!statSync(showPath).isDirectory()) continue;
    const show = SHOWS[showFolder];
    if (!show) throw new Error(`No show mapping for ${showFolder}`);

    for (const episodeFolder of readdirSync(showPath).sort()) {
      const episodePath = join(showPath, episodeFolder);
      if (!statSync(episodePath).isDirectory()) continue;
      const metadataPath = join(episodePath, 'metadata.json');
      try { statSync(metadataPath); } catch { continue; }

      const transcriptPath = join(episodePath, 'transcript.json');
      try { statSync(transcriptPath); } catch { continue; }
      const metadata = readJson<Metadata>(metadataPath);
      const transcript = readJson<TranscriptJson>(transcriptPath);
      if (!['zh', 'zho', 'cmn'].includes(transcript.language ?? '')) {
        throw new Error(`${episodePath}: transcript language is ${transcript.language ?? '(missing)'}, expected zh/zho/cmn`);
      }
      const segments = transcript.segments ?? [];
      const fullText = segments.map((segment) => segment.text).join('\n');
      const simplified = hasSimplifiedOnly(fullText);
      if (simplified) throw new Error(`${episodePath}: transcript still contains Simplified-only character ${simplified}`);

      const enCues = parseSrt(readFileSync(join(episodePath, 'bilingual.en.srt'), 'utf8'));
      const viCues = parseSrt(readFileSync(join(episodePath, 'bilingual.vi.srt'), 'utf8'));
      const enByKey = cueTranslationsByRoundedSecond(enCues);
      const viByKey = cueTranslationsByRoundedSecond(viCues);

      const id = String(nextId++);
      const cpm = speechRate(segments);
      const pauses = medianPauseMs(segments);
      const speakers = speakerCount(segments);
      const rating = rateEpisode(cpm, pauses, speakers, show.showId);
      const title = metadata.title ?? transcript.source?.title ?? episodeFolder;
      const description = firstSentence(metadata.title ?? title);
      const viDescription = viCues[0]?.lines.slice(1).join(' ').trim() || description;

      const rowTranscript = segments.map((segment) => {
        const key = cueKey(segment.start * 1000);
        return {
          time: key,
          seconds: Math.round(segment.start),
          endSeconds: typeof segment.end === 'number' ? Math.round(segment.end) : undefined,
          speaker: segment.speaker ?? undefined,
          text: segment.text,
          translation: enByKey.get(key) || undefined,
        };
      });

      viOverlay[id] = { transcript: Object.fromEntries([...viByKey.entries()].filter(([, value]) => value)) };

      seed.push({
        id: Number(id),
        showId: show.showId,
        title: show.title,
        author: show.publisher,
        topic: show.showId,
        duration: `${Math.round((metadata.audio_duration_seconds ?? transcript.audio_duration_seconds ?? 0) / 60)} min`,
        durationSeconds: Math.round(metadata.audio_duration_seconds ?? transcript.audio_duration_seconds ?? 0),
        episode: title,
        description: { en: description, vi: viDescription },
        tags: [show.showId, 'podcast'],
        level: rating.level,
        tocfl: rating.tocfl,
        speed: `≈ ${cpm} cpm`,
        levelReason: {
          en: `Transcript-only rating: about ${cpm} characters per minute, ${speakers} voice${speakers === 1 ? '' : 's'}, and median recoverable pauses of ${Math.round(pauses / 100) / 10} seconds.`,
          vi: viLevel(rating.level, cpm, speakers),
        },
        learningGoal: {
          en: `Follow a full Mandarin podcast episode about ${description}.`,
          vi: `Theo dõi một tập podcast tiếng Quan thoại đầy đủ về ${viDescription}.`,
        },
        audioUrl: metadata.audio_url,
        sourceUrl: metadata.page_url ?? metadata.source_url,
        redistributable: true,
        ratedBy: 'transcript-only',
        overlayVerified: false,
        authoredBy: { vi: 'auto-translated' },
        scriptConversion: show.scriptConversion,
        verifiedLesson: false,
        transcript: rowTranscript,
        vocabulary: [],
        questions: [],
      });
    }
  }

  ensureParent(args.out);
  ensureParent(args.overlayVi);
  writeFileSync(args.out, `${JSON.stringify(seed, null, 2)}\n`);
  writeFileSync(args.overlayVi, `${JSON.stringify(viOverlay, null, 2)}\n`);
}

if (require.main === module) main();
