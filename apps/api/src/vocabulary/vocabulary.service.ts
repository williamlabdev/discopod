import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { SaveWordDto } from './save-word.dto';
import type { SavedWord } from './saved-word.types';
import { VocabularyRepository } from './vocabulary.repository';

/**
 * Storage is behind `VocabularyRepository`; which adapter is bound depends on
 * `DATABASE_URL` (see vocabulary.module.ts). The id and the save time are
 * minted here rather than by the database, so both adapters produce the same
 * word and neither storage mode can quietly become the definition of one.
 */
@Injectable()
export class VocabularyService {
  constructor(private readonly words: VocabularyRepository) {}

  list(learnerId: string): Promise<SavedWord[]> {
    return this.words.list(learnerId);
  }

  save(learnerId: string, input: SaveWordDto): Promise<SavedWord> {
    const word: SavedWord = {
      id: randomUUID(),
      learnerId,
      savedAt: new Date().toISOString(),
      ...input,
    };

    return this.words.save(word);
  }
}
