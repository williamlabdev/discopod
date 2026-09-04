import { Injectable, NotFoundException } from '@nestjs/common';

import { CatalogRepository } from './catalog.repository';
import type {
  Episode,
  EpisodeQuery,
  LearningLevel,
  RankedEpisode,
  Show,
} from './catalog.types';
import { canRenderReason, renderReason } from './reason.render';
import { comfortableRate, isCalibrated } from './speech-rate';
import {
  DEFAULT_PAIR,
  inLanguage,
  LANGUAGES,
  requireLanguage,
  type LanguagePair,
  type LanguageTag,
} from './language.types';

/**
 * Whose language the learner reads, when a caller does not say.
 *
 * `speaks` *is* a request parameter, which ADR 0002 does not contradict: what
 * that ADR rules out is the browser calling this API, and what ADR 0003 makes a
 * route segment is the pair in the *site's* URLs. The web app reads those
 * segments at build time and asks here for one pair's catalogue — server to
 * server, before the export exists. The default keeps `en → en` callers, and
 * every hand-typed curl, working unchanged.
 */
const DEFAULT_SPEAKS: LanguageTag = DEFAULT_PAIR.speaks;

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  listShows(): Promise<Show[]> {
    return this.repository.findShows();
  }

  /**
   * The pairs this catalogue can actually serve, derived rather than declared.
   *
   * A pair exists when some episode can be presented under it: the show is
   * spoken in `learning`, and the episode carries an explanatory layer in
   * `speaks` that this API can also phrase a reason in. Nothing here is
   * configured — translate one more episode and a pair appears, drop the last
   * one and it disappears, and the web app's route tree follows on the next
   * build. A hand-written list would be a second place to be wrong about which
   * languages the app speaks, and it would be wrong quietly.
   *
   * Sorted so the build output is stable: the default pair first, because it
   * is what a caller naming no pair gets, then alphabetically.
   */
  async listPairs(): Promise<LanguagePair[]> {
    const [episodes, shows] = await Promise.all([
      this.repository.findEpisodes(),
      this.repository.findShows(),
    ]);
    const learningOf = new Map(shows.map((show) => [show.id, show.language]));

    const found = new Map<string, LanguagePair>();
    for (const episode of episodes) {
      const learning = learningOf.get(episode.showId);
      if (!learning) continue;
      for (const speaks of LANGUAGES) {
        if (this.speaksTo(episode, speaks)) found.set(`${speaks}|${learning}`, { speaks, learning });
      }
    }

    const isDefault = (pair: LanguagePair) =>
      pair.speaks === DEFAULT_PAIR.speaks && pair.learning === DEFAULT_PAIR.learning;

    return [...found.values()].sort((a, b) => {
      if (isDefault(a) !== isDefault(b)) return isDefault(a) ? -1 : 1;
      return `${a.speaks}|${a.learning}`.localeCompare(`${b.speaks}|${b.learning}`);
    });
  }

  async getShow(id: string): Promise<Show> {
    const show = await this.repository.findShow(id);
    if (!show) throw new NotFoundException(`Show ${id} not found`);
    return show;
  }

  async getEpisode(id: string, speaks: LanguageTag = DEFAULT_SPEAKS): Promise<Episode> {
    const episode = await this.repository.findEpisode(id);
    if (!episode) throw new NotFoundException(`Episode ${id} not found`);
    // Not in this pair's catalogue is not found, for this caller. Returning it
    // anyway would hand the web app an episode it cannot render and make the
    // exclusion surface as a failed build instead of an absent episode.
    if (!this.speaksTo(episode, speaks)) {
      throw new NotFoundException(`Episode ${id} is not in the ${speaks} catalogue`);
    }
    return episode;
  }

  async listEpisodes(query: EpisodeQuery): Promise<RankedEpisode[]> {
    const episodes = await this.repository.findEpisodes();
    const level = query.level ?? 'Intermediate';
    const speaks = query.speaks ?? DEFAULT_SPEAKS;

    // Topics live on the show, not the episode, so this needs the join.
    // Only pay for it when the caller actually filters by topic.
    const showIdsForTopic = query.topic ? await this.showIdsWithTopic(query.topic) : null;

    const filtered = episodes.filter((episode) => {
      if (!this.speaksTo(episode, speaks)) return false;
      if (query.level && episode.profile.level !== query.level) return false;
      if (showIdsForTopic && !showIdsForTopic.has(episode.showId)) return false;
      if (query.search && !this.matches(episode, query.search)) return false;
      return true;
    });

    const ranked = filtered.map((episode) => this.rank(episode, level, speaks));

    if (query.sort === 'recent') return ranked;
    return ranked.sort((a, b) => b.suitability - a.suitability);
  }

  /**
   * The "start here" pick: the single most followable episode for this level,
   * returned with the reasoning stated. Never recommend without a reason.
   */
  async startHere(
    level: LearningLevel,
    speaks: LanguageTag = DEFAULT_SPEAKS,
  ): Promise<RankedEpisode | null> {
    const all = await this.repository.findEpisodes();
    const episodes = all.filter((episode) => this.speaksTo(episode, speaks));
    if (episodes.length === 0) return null;

    // Score for *this* learner, then prefer an episode pitched at their level.
    // Going through listEpisodes({ level }) would filter and score in one step,
    // but the fallback below needs the rest of the catalogue scored the same
    // way. Passing `level: undefined` scored everything as Intermediate, so a
    // Beginner could be told a 130 wpm episode was "at a pace you can follow"
    // — the reason was computed for a learner who was not the one reading it.
    const ranked = episodes
      .map((episode) => this.rank(episode, level, speaks))
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
  private rank(episode: Episode, level: LearningLevel, speaks: LanguageTag): RankedEpisode {
    const { profile } = episode;
    // speaksTo already refused any episode whose unit has no thresholds, so
    // this cannot be undefined for an episode that reached the ranking.
    const comfortable = comfortableRate(profile.speechRate.unit, level);
    if (comfortable === undefined) {
      throw new Error(
        `Episode ${episode.id} is measured in ${profile.speechRate.unit}, which has no ` +
          `comfortable-rate thresholds. It should have been excluded, not ranked.`,
      );
    }

    // Each penalty is 0-1, where 0 is "no obstacle for this learner".
    const ratePenalty = Math.min(
      1,
      Math.max(0, (profile.speechRate.value - comfortable) / comfortable),
    );
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
      reason: this.explain(episode, level, speaks),
    };
  }

  /**
   * Is this episode in `speaks`'s catalogue at all?
   *
   * Three conditions, and all three are exclusions rather than degradations.
   * The episode must carry an authored reason in that language — everything
   * else a page renders travels with it, and profile.reason is the field the
   * ranking contract makes mandatory. The language must have a reason renderer,
   * because a ranked episode has to say why it ranks there in the reader's own
   * words; a language we can fill but not phrase is not supported yet.
   *
   * And the episode's speech rate must be measured in a unit this app has
   * thresholds for. That one is about the audio, not the reader, so it excludes
   * the episode from *every* pair rather than from one: an episode we cannot
   * honestly place on the "can you follow this by ear?" axis has no suitability
   * score to offer anybody, and a score computed against the wrong unit would
   * look exactly like one that means something. See speech-rate.ts.
   *
   * ADR 0003: a missing key is an exclusion, never a fallback to English.
   * ADR 0004 extends the same rule to an uncalibrated unit. This method is
   * where "excluded" is decided, and catalog-api.ts's assertEpisode on the web
   * side is the backstop for whatever slips past it.
   */
  private speaksTo(episode: Episode, speaks: LanguageTag): boolean {
    return (
      isCalibrated(episode.profile.speechRate.unit) &&
      canRenderReason(speaks) &&
      inLanguage(episode.profile.reason, speaks) !== undefined
    );
  }

  /**
   * The ranked reason, composed for one reader in their own language.
   *
   * The measured half is rendered per language (reason.render.ts) rather than
   * substituted into one template: English inflects plurals and ends in ".",
   * Chinese does neither, and a shared format string produces half a sentence
   * in each. The authored half is fetched by key.
   *
   * `requireLanguage` throws rather than dropping the authored half. A reason
   * that silently loses the sentence explaining the level is a ranked result
   * without its reason, which this product does not ship. Callers reach here
   * only through speaksTo, so in practice it fires on a bug, not on data.
   */
  private explain(
    episode: Episode,
    level: LearningLevel,
    speaks: LanguageTag = DEFAULT_SPEAKS,
  ): string {
    return renderReason(speaks, {
      durationSeconds: episode.durationSeconds,
      speakerCount: episode.profile.speakerCount,
      speechRate: episode.profile.speechRate,
      comfortable:
        episode.profile.speechRate.value <=
        (comfortableRate(episode.profile.speechRate.unit, level) ?? Number.POSITIVE_INFINITY),
      authored: requireLanguage(
        episode.profile.reason,
        speaks,
        `Episode ${episode.id} profile.reason`,
      ),
    });
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
    // Search spans every authored language, not just the caller's: a learner
    // typing in their own language and a learner typing an English term are
    // both looking for the same episode.
    const haystack = [
      episode.title,
      episode.description,
      ...Object.values(episode.learningGoal),
      episode.profile.cefr,
      ...episode.vocabulary.map((entry) => entry.term),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search.toLowerCase());
  }
}
