import { Module } from '@nestjs/common';
import { WebinarController } from './webinar.controller';
import { WebinarService } from './webinar.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [WebinarController],
  providers: [WebinarService, PrismaService],
  exports: [WebinarService],
})
export class WebinarModule {}
