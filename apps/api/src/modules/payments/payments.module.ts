import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsDjiboutiController } from './payments-djibouti.controller';
import { WaafiPayService } from './waafi-pay.service';
import { DMoneyService } from './d-money.service';
import { PrismaService } from '../../config/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-retry' }),
  ],
  controllers: [
    PaymentsController,
    PaymentsDjiboutiController,   // Paiements locaux Djibouti
  ],
  providers: [
    PaymentsService,
    WaafiPayService,              // Waafi / Salaam Bank / ZAAD / EVCPlus
    DMoneyService,                // D-Money (Djibouti Telecom) — pret a connecter
    PrismaService,
  ],
  exports: [PaymentsService, WaafiPayService, DMoneyService],
})
export class PaymentsModule {}
