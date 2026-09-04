import { Injectable } from '@nestjs/common';

import { CatalogRepository } from './catalog.repository';
import { loadSeedCatalog } from './catalog.seed';
import type { Episode, Show } from './catalog.types';

@Injectable()
export class InMemoryCatalogRepository extends CatalogRepository {
  private readonly shows: Show[];
  private readonly episodes: Episode[];

  constructor() {
    super();
    const { shows, episodes } = loadSeedCatalog();
    this.shows = shows;
    this.episodes = episodes;
  }

  findShows(): Promise<Show[]> {
    return Promise.resolve(this.shows);
  }

  findShow(id: string): Promise<Show | null> {
    return Promise.resolve(this.shows.find((show) => show.id === id) ?? null);
  }

  findEpisodes(): Promise<Episode[]> {
    return Promise.resolve(this.episodes);
  }

  findEpisode(id: string): Promise<Episode | null> {
    return Promise.resolve(this.episodes.find((episode) => episode.id === id) ?? null);
  }

  findEpisodesByShow(showId: string): Promise<Episode[]> {
    return Promise.resolve(this.episodes.filter((episode) => episode.showId === showId));
  }
}
