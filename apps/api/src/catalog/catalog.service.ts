import { Injectable, NotFoundException } from '@nestjs/common';

import { CatalogRepository } from './catalog.repository';
import type {
  Episode,
  EpisodeQuery,
  LearningLevel,
  RankedEpisode,
  Show,
} from './catalog.types';

/** Speech rate a learner at each level can comfortably follow, in wpm. */
const COMFORTABLE_RATE: Record<LearningLevel, number> = {
  Beginner: 110,
  Intermediate: 145,
  Advanced: 180,
};

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  listShows(): Promise<Show[]> {
    return this.repository.findShows();
  }

  async getShow(id: string): Promise<Show> {
    const show = await this.repository.findShow(id);
    if (!show) throw new NotFoundException(`Show ${id} not found`);
    return show;
  }

  async getEpisode(id: string): Promise<Episode> {
    const episode = await this.repository.findEpisode(id);
    if (!episode) throw new NotFoundException(`Episode ${id} not found`);
    return episode;
  }

  async listEpisodes(query: EpisodeQuery): Promise<RankedEpisode[]> {
    const episodes = await this.repository.findEpisodes();
    const level = query.level ?? 'Intermediate';

    // Topics live on the show, not the episode, so this needs the join.
    // Only pay for it when the caller actually filters by topic.
    const showIdsForTopic = query.topic ? await this.showIdsWithTopic(query.topic) : null;

    const filtered = episodes.filter((episode) => {
      if (query.level && episode.profile.level !== query.level) return false;
      if (showIdsForTopic && !showIdsForTopic.has(episode.showId)) return false;
      if (query.search && !this.matches(episode, query.search)) return false;
      return true;
    });

    const ranked = filtered.map((episode) => this.rank(episode, level));

    if (query.sort === 'recent') return ranked;
    return ranked.sort((a, b) => b.suitability - a.suitability);
  }

  /**
   * The "start here" pick: the single most followable episode for this level,
   * returned with the reasoning stated. Never recommend without a reason.
   */
  async startHere(level: LearningLevel): Promise<RankedEpisode | null> {
    const episodes = await this.repository.findEpisodes();
    if (episodes.length === 0) return null;

    // Score for *this* learner, then prefer an episode pitched at their level.
    // Going through listEpisodes({ level }) would filter and score in one step,
    // but the fallback below needs the rest of the catalogue scored the same
    // way. Passing `level: undefined` scored everything as Intermediate, so a
    // Beginner could be told a 130 wpm episode was "at a pace you can follow"
    // — the reason was computed for a learner who was not the one reading it.
    const ranked = episodes
      .map((episode) => this.rank(episode, level))
      .sort((a, b) => b.suitability - a.suitability);

    return ranked.find((item) => item.episode.profile.level === level) ?? ranked[0];
  }

  /**
   * Suitability = can this learner follow it by ear?
   *
   * Placeholder for the two-signal model in the product vision: this is the
   * learnability half only. The completion half (how far learners at this level
   * actually get before quitting) needs listening data we do not have yet, and
   * is deliberately absent rather than faked.
   */
  private rank(episode: Episode, level: LearningLevel): RankedEpisode {
    const { profile } = episode;
    const comfortable = COMFORTABLE_RATE[level];

    // Each penalty is 0-1, where 0 is "no obstacle for this learner".
    const ratePenalty = Math.min(1, Math.max(0, (profile.speechRate - comfortable) / comfortable));
    const coveragePenalty = Math.min(1, Math.max(0, (0.95 - profile.vocabularyCoverage) / 0.3));
    const speakerPenalty = Math.min(1, Math.max(0, (profile.speakerCount - 1) / 3));
    const registerPenalty = (profile.slangLoad + profile.accentLoad) / 2;

    const score =
      100 *
      (1 -
        (0.4 * ratePenalty +
          0.3 * coveragePenalty +
          0.2 * speakerPenalty +
          0.1 * registerPenalty));

    return {
      episode,
      suitability: Math.round(Math.min(100, Math.max(0, score))),
      reason: this.explain(episode, level),
    };
  }

  private explain(episode: Episode, level: LearningLevel): string {
    // floor, not round: a 30-second episode rounds up to "1 minutes", which is
    // both the wrong number and the wrong plural.
    const minutes = Math.floor(episode.durationSeconds / 60);
    const length =
      minutes >= 1
        ? `${minutes} minute${minutes === 1 ? '' : 's'}`
        : `${episode.durationSeconds} seconds`;
    const voices =
      episode.profile.speakerCount === 1
        ? 'one voice'
        : `${episode.profile.speakerCount} voices`;
    const pace =
      episode.profile.speechRate <= COMFORTABLE_RATE[level]
        ? 'at a pace you can follow'
        : 'faster than your usual pace';

    return `${length}, ${voices}, ${episode.profile.speechRate} wpm — ${pace}. ${episode.profile.reason}.`;
  }

  private async showIdsWithTopic(topic: string): Promise<Set<string>> {
    const wanted = topic.toLowerCase();
    const shows = await this.repository.findShows();
    return new Set(
      shows
        .filter((show) => show.topics.some((entry) => entry.toLowerCase() === wanted))
        .map((show) => show.id),
    );
  }

  private matches(episode: Episode, search: string): boolean {
    const haystack = [
      episode.title,
      episode.description,
      episode.learningGoal,
      episode.profile.cefr,
      ...episode.vocabulary.map((entry) => entry.term),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search.toLowerCase());
  }
}
