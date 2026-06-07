import { Module } from '@nestjs/common';
import { DeveloperController } from './developer.controller';
import { DeveloperService } from './developer.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [DeveloperController],
  providers: [DeveloperService, PrismaService],
  exports: [DeveloperService],
})
export class DeveloperModule {}
