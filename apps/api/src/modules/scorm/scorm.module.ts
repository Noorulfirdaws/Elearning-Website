import { Module } from '@nestjs/common';
import { ScormController } from './scorm.controller';
import { ScormService } from './scorm.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [ScormController],
  providers: [ScormService, PrismaService],
  exports: [ScormService],
})
export class ScormModule {}
