import { Logger, Module } from '@nestjs/common';

import { DATABASE, type MaybeDatabase } from '../db/database.module';
import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';
import { InMemoryCatalogRepository } from './in-memory-catalog.repository';
import { PostgresCatalogRepository } from './postgres-catalog.repository';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    {
      provide: CatalogRepository,
      inject: [DATABASE],
      /**
       * Awaited during bootstrap, so the API cannot answer a catalogue request
       * before its catalogue exists. If Postgres is unreachable this throws
       * and the process fails to start — see database.module.ts for why that
       * is better than serving an empty catalogue.
       */
      useFactory: async (db: MaybeDatabase): Promise<CatalogRepository> => {
        if (!db) return new InMemoryCatalogRepository();

        const repository = new PostgresCatalogRepository(db);
        const { migrations, published } = await repository.initialise();
        const logger = new Logger('CatalogRepository');
        if (migrations.length > 0) logger.log(`Applied migrations: ${migrations.join(', ')}`);
        logger.log(
          published
            ? 'Published the seed catalogue to Postgres'
            : 'Postgres already holds this seed catalogue',
        );
        return repository;
      },
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
