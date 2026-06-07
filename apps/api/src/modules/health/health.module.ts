import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { PrismaService }    from '../../config/prisma.service';
import { CacheService }     from '../../common/cache/cache.service';
import { SearchService }    from '../search/search.service';
import { VideoService }     from '../video/video.service';
import { PaymentsService }  from '../payments/payments.service';
import { MetricsService }   from '../../common/metrics/metrics.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'progress-heartbeat' },
      { name: 'quiz-grading' },
      { name: 'payment-retry' },
    ),
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    CacheService,
    SearchService,
    VideoService,
    PaymentsService,
    MetricsService,
  ],
  exports: [MetricsService],
})
export class HealthModule {}
