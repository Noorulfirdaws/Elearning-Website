import { Module } from '@nestjs/common';
import { AchatController } from './achat.controller';
import { AchatService } from './achat.service';
import { WaafiPayService } from '../payments/waafi-pay.service';
import { PrismaService } from '../../config/prisma.service';
import { PermissionsTokenService } from './permissions-token.service';

@Module({
  controllers: [AchatController],
  providers:   [AchatService, WaafiPayService, PrismaService, PermissionsTokenService],
  exports:     [AchatService, PermissionsTokenService],
})
export class AchatModule {}
