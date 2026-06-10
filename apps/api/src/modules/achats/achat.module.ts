import { Module } from '@nestjs/common';
import { AchatController } from './achat.controller';
import { AchatService } from './achat.service';
import { AchatCron } from './achat.cron';
import { WaafiPayService } from '../payments/waafi-pay.service';
import { PrismaService } from '../../config/prisma.service';
import { PermissionsTokenService } from './permissions-token.service';

@Module({
  controllers: [AchatController],
  providers:   [AchatService, AchatCron, WaafiPayService, PrismaService, PermissionsTokenService],
  exports:     [AchatService, AchatCron, PermissionsTokenService],
})
export class AchatModule {}
