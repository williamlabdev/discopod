import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { LANGUAGES, type LanguageTag } from '../catalog/language.types';

export class SaveWordDto {
  /**
   * The pair the word was saved under. `meaning` is written in `speaks` and
   * `term` is a word of `learning`; a learner may hold more than one pair over
   * their life with the app, and a bare gloss with no language on it cannot be
   * reviewed correctly afterwards. See ADR 0003, decision 5.
   */
  @IsIn([...LANGUAGES])
  speaks!: LanguageTag;

  @IsIn([...LANGUAGES])
  learning!: LanguageTag;

  @IsString()
  @MaxLength(64)
  term!: string;

  @IsString()
  @MaxLength(512)
  meaning!: string;

  @IsString()
  @MaxLength(1024)
  sentence!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  speaker?: string;

  @IsString()
  @MaxLength(64)
  episodeId!: string;

  @IsInt()
  @Min(0)
  timestampMs!: number;
}
