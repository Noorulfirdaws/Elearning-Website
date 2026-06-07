import { Module } from '@nestjs/common';
import { BetaController } from './beta.controller';
import { BetaService }    from './beta.service';
import { FeedbackController } from './feedback.controller';
import { FeedbackService }    from './feedback.service';

@Module({
  controllers: [BetaController, FeedbackController],
  providers:   [BetaService, FeedbackService],
  exports:     [BetaService],
})
export class BetaModule {}
