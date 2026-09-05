import type { SavedWord } from './saved-word.types';

/**
 * Port for saved-word storage, matching `CatalogRepository`'s shape.
 *
 * The split is not symmetric with the catalogue's, though, and the asymmetry
 * is the point: a catalogue row can be republished from the seed, and a saved
 * word cannot be regenerated from anything. In-memory storage is a legitimate
 * mode for the catalogue and a data-loss bug for this.
 */
export abstract class VocabularyRepository {
  abstract list(learnerId: string): Promise<SavedWord[]>;
  /** Takes a complete word: the id and timestamp are the service's to mint. */
  abstract save(word: SavedWord): Promise<SavedWord>;
}
