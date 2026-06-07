import { Module } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';

@Module({
  controllers: [SectionsController],
  providers: [SectionsService, PrismaService],
  exports: [SectionsService],
})
export class SectionsModule {}

