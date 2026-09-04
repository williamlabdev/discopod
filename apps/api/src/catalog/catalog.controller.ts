import { Controller, Get, Param, Query } from '@nestjs/common';

import { CatalogService } from './catalog.service';
import { EpisodeQueryDto } from './episode-query.dto';
import type { Episode, LearningLevel, RankedEpisode, Show, TranscriptCue } from './catalog.types';
import type { LanguagePair } from './language.types';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /**
   * Which learner-language pairs this catalogue serves. The web app asks once
   * per build and generates a route subtree per pair — see ADR 0003.
   */
  @Get('pairs')
  listPairs(): Promise<LanguagePair[]> {
    return this.catalog.listPairs();
  }

  @Get('shows')
  listShows(): Promise<Show[]> {
    return this.catalog.listShows();
  }

  @Get('shows/:id')
  getShow(@Param('id') id: string): Promise<Show> {
    return this.catalog.getShow(id);
  }

  @Get('episodes')
  listEpisodes(@Query() query: EpisodeQueryDto): Promise<RankedEpisode[]> {
    return this.catalog.listEpisodes(query);
  }

  @Get('episodes/start-here')
  startHere(@Query() query: EpisodeQueryDto): Promise<RankedEpisode | null> {
    const level: LearningLevel = query.level ?? 'Intermediate';
    return this.catalog.startHere(level, query.speaks);
  }

  @Get('episodes/:id')
  getEpisode(@Param('id') id: string, @Query() query: EpisodeQueryDto): Promise<Episode> {
    return this.catalog.getEpisode(id, query.speaks);
  }

  @Get('episodes/:id/transcript')
  async getTranscript(
    @Param('id') id: string,
    @Query() query: EpisodeQueryDto,
  ): Promise<TranscriptCue[]> {
    const episode = await this.catalog.getEpisode(id, query.speaks);
    return episode.transcript;
  }
}
