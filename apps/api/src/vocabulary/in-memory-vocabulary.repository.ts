import { Injectable } from '@nestjs/common';

import type { SavedWord } from './saved-word.types';
import { VocabularyRepository } from './vocabulary.repository';

/**
 * State is lost on restart. Bound only when `DATABASE_URL` is unset — which
 * is the build and the default dev setup, where nobody is saving words they
 * expect to keep.
 */
@Injectable()
export class InMemoryVocabularyRepository extends VocabularyRepository {
  private readonly words = new Map<string, SavedWord[]>();

  list(learnerId: string): Promise<SavedWord[]> {
    return Promise.resolve(this.words.get(learnerId) ?? []);
  }

  save(word: SavedWord): Promise<SavedWord> {
    const existing = this.words.get(word.learnerId) ?? [];
    this.words.set(word.learnerId, [...existing, word]);
    return Promise.resolve(word);
  }
}
