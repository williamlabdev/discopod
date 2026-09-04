import type { Episode, Show } from './catalog.types';

/**
 * Port for catalogue storage. The in-memory adapter seeds from JSON today;
 * a Postgres adapter implements the same interface without touching callers.
 */
export abstract class CatalogRepository {
  abstract findShows(): Promise<Show[]>;
  abstract findShow(id: string): Promise<Show | null>;
  abstract findEpisodes(): Promise<Episode[]>;
  abstract findEpisode(id: string): Promise<Episode | null>;
  abstract findEpisodesByShow(showId: string): Promise<Episode[]>;
}
