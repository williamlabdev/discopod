import { Controller, Get, Param, Query } from '@nestjs/common';

import { CatalogService } from './catalog.service';
import { EpisodeQueryDto } from './episode-query.dto';
import type { Episode, LearningLevel, RankedEpisode, Show, TranscriptCue } from './catalog.types';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

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
    return this.catalog.startHere(level);
  }

  @Get('episodes/:id')
  getEpisode(@Param('id') id: string): Promise<Episode> {
    return this.catalog.getEpisode(id);
  }

  @Get('episodes/:id/transcript')
  async getTranscript(@Param('id') id: string): Promise<TranscriptCue[]> {
    const episode = await this.catalog.getEpisode(id);
    return episode.transcript;
  }
}
