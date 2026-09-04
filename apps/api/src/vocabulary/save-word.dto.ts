import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SaveWordDto {
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
