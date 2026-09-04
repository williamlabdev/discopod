import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import type { EpisodeQuery, LearningLevel } from './catalog.types';
import { LANGUAGES, type LanguageTag } from './language.types';

export class EpisodeQueryDto implements EpisodeQuery {
  /** Which language's catalogue to answer with. Omitted means the default pair. */
  @IsOptional()
  @IsIn([...LANGUAGES])
  speaks?: LanguageTag;

  /**
   * Which language's content to answer with. Omitted means the default pair,
   * not "everything" — a caller that forgets this parameter must not be handed
   * a catalogue in a language it never asked to learn.
   */
  @IsOptional()
  @IsIn([...LANGUAGES])
  learning?: LanguageTag;

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
