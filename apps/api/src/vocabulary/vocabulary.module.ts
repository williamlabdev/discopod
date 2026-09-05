import { Module } from '@nestjs/common';

import { DATABASE, type MaybeDatabase } from '../db/database.module';
import { InMemoryVocabularyRepository } from './in-memory-vocabulary.repository';
import { PostgresVocabularyRepository } from './postgres-vocabulary.repository';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyRepository } from './vocabulary.repository';
import { VocabularyService } from './vocabulary.service';

@Module({
  controllers: [VocabularyController],
  providers: [
    VocabularyService,
    {
      provide: VocabularyRepository,
      inject: [DATABASE],
      // Async so the schema is in place before the app listens: a POST that
      // arrives during a migration should not be the thing that discovers it.
      useFactory: async (db: MaybeDatabase): Promise<VocabularyRepository> => {
        if (!db) return new InMemoryVocabularyRepository();
        const repository = new PostgresVocabularyRepository(db);
        await repository.initialise();
        return repository;
      },
    },
  ],
})
export class VocabularyModule {}
