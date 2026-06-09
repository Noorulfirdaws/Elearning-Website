/**
 * PaymentsDjiboutiController
 * ==========================
 * Endpoints pour les paiements locaux djiboutiens
 *
 * Routes :
 *  GET  /payments/djibouti/status          — Verifier quels providers sont configures
 *  POST /payments/djibouti/waafi/initiate  — Initier paiement Waafi (PreAuthorize)
 *  POST /payments/djibouti/waafi/commit    — Confirmer apres approbation telephone
 *  POST /payments/djibouti/waafi/cancel    — Annuler une transaction en attente
 *  POST /payments/djibouti/dmoney/initiate — Initier paiement D-Money
 *  POST /payments/djibouti/dmoney/webhook  — Webhook callback Djibouti Telecom
 */

import {
  Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { WaafiPayService } from './waafi-pay.service';
import { DMoneyService } from './d-money.service';
import { PrismaService } from '../../config/prisma.service';

@ApiTags('payments-djibouti')
@Controller('payments/djibouti')
export class PaymentsDjiboutiController {
  constructor(
    private waafi:   WaafiPayService,
    private dmoney:  DMoneyService,
    private prisma:  PrismaService,
  ) {}

  // ─── Statut des providers ────────────────────────────────────────────────────

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Statut des providers de paiement djiboutiens' })
  getStatus() {
    return {
      waafi:  this.waafi.getStatus(),
      dmoney: this.dmoney.getStatus(),
    };
  }

  // ─── WaafiPay ───────────────────────────────────────────────────────────────

  @Post('waafi/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initier un paiement Waafi (envoie USSD au telephone)' })
  async waafiInitiate(
    @CurrentUser('id') userId: string,
    @Body() body: {
      courseId: string;
      phoneNumber: string;
      amount: number;
      currency?: 'USD' | 'SLSH';
    },
  ) {
    // Recuperer le cours pour la description
    const course = await this.prisma.course.findUnique({
      where: { id: body.courseId },
      select: { title: true, price: true },
    });

    if (!course) {
      return { success: false, message: 'Cours introuvable.' };
    }

    const amount = body.amount || Number(course.price);
    const result = await this.waafi.preAuthorize({
      phoneNumber: body.phoneNumber.replace(/\s+/g, '').replace(/^\+/, ''),
      amount,
      currency: body.currency || 'USD',
      description: `LearnHub - ${course.title}`,
      courseId: body.courseId,
      userId,
    });

    return result;
  }

  @Post('waafi/commit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Valider un paiement Waafi apres confirmation telephone' })
  async waafiCommit(
    @CurrentUser('id') userId: string,
    @Body() body: {
      transactionId: string;
      requestId: string;
      courseId: string;
    },
  ) {
    const result = await this.waafi.commit({
      requestId:     body.requestId,
      transactionId: body.transactionId,
      description:   'Validation paiement LearnHub Djibouti',
    });

    // Si paiement valide → creer l'enrollment
    if (result.success) {
      await this.prisma.enrollment.upsert({
        where: {
          userId_courseId: { userId, courseId: body.courseId },
        },
        create: {
          userId,
          courseId: body.courseId,
          enrolledAt: new Date(),
        },
        update: {},
      });
    }

    return result;
  }

  @Post('waafi/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annuler un paiement Waafi en attente' })
  @HttpCode(HttpStatus.OK)
  async waafiCancel(@Body() body: { transactionId: string }) {
    await this.waafi.cancel(body.transactionId);
    return { success: true, message: 'Transaction annulee.' };
  }

  // ─── D-Money ────────────────────────────────────────────────────────────────

  @Post('dmoney/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initier un paiement D-Money (Djibouti Telecom)' })
  async dmoneyInitiate(
    @CurrentUser('id') userId: string,
    @Body() body: {
      courseId: string;
      phoneNumber: string;
      amount: number;
      currency?: 'DJF' | 'USD';
    },
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: body.courseId },
      select: { title: true, price: true },
    });

    return this.dmoney.initiatePayment({
      phoneNumber: body.phoneNumber,
      amount: body.amount || Number(course?.price || 0),
      currency: body.currency || 'USD',
      description: `LearnHub - ${course?.title || 'Cours'}`,
      orderId: `LH-DM-${userId.slice(0, 6)}-${Date.now()}`,
    });
  }

  @Post('dmoney/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook callback D-Money (Djibouti Telecom)' })
  async dmoneyWebhook(@Body() payload: any) {
    return this.dmoney.handleWebhook(payload);
  }
}
