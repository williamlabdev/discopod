import { Module } from '@nestjs/common';

import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';
import { InMemoryCatalogRepository } from './in-memory-catalog.repository';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    { provide: CatalogRepository, useClass: InMemoryCatalogRepository },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
