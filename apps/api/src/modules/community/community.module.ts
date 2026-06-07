import { Module } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  controllers: [CommunityController],
  providers: [CommunityService, PrismaService],
  exports: [CommunityService],
})
export class CommunityModule {}

