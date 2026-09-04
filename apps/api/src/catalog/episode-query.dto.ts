import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import type { EpisodeQuery, LearningLevel } from './catalog.types';

export class EpisodeQueryDto implements EpisodeQuery {
  @IsOptional()
  @IsIn(['Beginner', 'Intermediate', 'Advanced'])
  level?: LearningLevel;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;

  @IsOptional()
  @IsIn(['suitability', 'recent'])
  sort?: 'suitability' | 'recent';
}
