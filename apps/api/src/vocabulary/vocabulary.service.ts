import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { SaveWordDto } from './save-word.dto';
import type { SavedWord } from './saved-word.types';

/**
 * In-memory store: state is lost on restart. Swapped for a persistent
 * repository when the datastore lands — see docs/ARCHITECTURE.md.
 */
@Injectable()
export class VocabularyService {
  private readonly words = new Map<string, SavedWord[]>();

  list(learnerId: string): SavedWord[] {
    return this.words.get(learnerId) ?? [];
  }

  save(learnerId: string, input: SaveWordDto): SavedWord {
    const word: SavedWord = {
      id: randomUUID(),
      learnerId,
      savedAt: new Date().toISOString(),
      ...input,
    };

    const existing = this.words.get(learnerId) ?? [];
    this.words.set(learnerId, [...existing, word]);
    return word;
  }
}
