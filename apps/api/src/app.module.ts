import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CatalogModule } from './catalog/catalog.module';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    CatalogModule,
    VocabularyModule,
  ],
})
export class AppModule {}
