import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { SaveWordDto } from './save-word.dto';
import type { SavedWord } from './saved-word.types';
import { VocabularyService } from './vocabulary.service';

/**
 * Learner identity is a header placeholder until auth lands; every handler
 * already takes a learnerId so the auth swap does not change the shape.
 */
@Controller('me/words')
export class VocabularyController {
  constructor(private readonly vocabulary: VocabularyService) {}

  @Get()
  list(@Headers('x-learner-id') learnerId = 'anonymous'): SavedWord[] {
    return this.vocabulary.list(learnerId);
  }

  @Post()
  save(
    @Body() body: SaveWordDto,
    @Headers('x-learner-id') learnerId = 'anonymous',
  ): SavedWord {
    return this.vocabulary.save(learnerId, body);
  }
}
