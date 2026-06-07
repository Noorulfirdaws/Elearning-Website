import { Module } from '@nestjs/common';
import { LearningPathsController } from './learning-paths.controller';
import { LearningPathsService } from './learning-paths.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [LearningPathsController],
  providers: [LearningPathsService, PrismaService],
  exports: [LearningPathsService],
})
export class LearningPathsModule {}
