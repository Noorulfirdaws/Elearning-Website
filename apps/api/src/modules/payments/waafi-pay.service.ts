/**
 * WaafiPayService
 * ===============
 * Integration avec WaafiPay (Salaam African Bank, Djibouti)
 * Supporte : WAAFI wallet, ZAAD, EVCPlus, SAHAL
 *
 * Flux de paiement :
 *  1. POST /payments/waafi/initiate  → PreAuthorize (envoie USSD au telephone)
 *  2. L'eleve confirme sur son telephone Waafi/Salaam
 *  3. POST /payments/waafi/commit    → Commit (valide le paiement)
 *  4. Enrollment cree automatiquement
 *
 * Docs : https://docs.waafipay.com
 * SDK  : https://github.com/iamshabell/waafi-pay-sdk
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma.service';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaafiPreAuthorizeResult {
  success: boolean;
  requestId: string;
  transactionId?: string;
  invoiceId: string;
  status: 'APPROVED' | 'forApproval' | 'FAILED';
  message: string;
}

export interface WaafiCommitResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  message: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class WaafiPayService {
  private readonly logger = new Logger(WaafiPayService.name);

  // Endpoint officiel WaafiPay
  private readonly WAAFI_API = 'https://api.waafipay.com/asm';

  // Sandbox pour les tests
  private readonly WAAFI_SANDBOX = 'https://sandbox.waafipay.com/asm';

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private get merchantUid(): string {
    return this.config.get('app.waafi.merchantUid') || '';
  }

  private get apiUserId(): string {
    return this.config.get('app.waafi.apiUserId') || '';
  }

  private get apiKey(): string {
    return this.config.get('app.waafi.apiKey') || '';
  }

  private get isSandbox(): boolean {
    return this.config.get('app.waafi.sandbox') !== 'false';
  }

  private get endpoint(): string {
    return this.isSandbox ? this.WAAFI_SANDBOX : this.WAAFI_API;
  }

  private get isConfigured(): boolean {
    return !!(this.merchantUid && this.apiUserId && this.apiKey);
  }

  // ─── PreAuthorize — Etape 1 : envoyer la demande USSD ──────────────────────

  async preAuthorize(params: {
    phoneNumber: string;   // ex: "25261234567" (format international sans +)
    amount: number;        // en USD ou SLSH
    currency: 'USD' | 'SLSH';
    description: string;
    courseId: string;
    userId: string;
  }): Promise<WaafiPreAuthorizeResult> {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'WaafiPay non configure. Ajoutez WAAFI_MERCHANT_UID, WAAFI_API_USER_ID, WAAFI_API_KEY dans .env',
      );
    }

    const invoiceId = `LH-${Date.now()}-${params.courseId.slice(0, 6)}`;
    const requestId = uuidv4();

    const payload = {
      schemaVersion: '1.0',
      requestId,
      timestamp: new Date().toISOString(),
      channelName: 'WEB',
      serviceName: 'API_PREAUTHORIZE',
      serviceParams: {
        merchantUid:   this.merchantUid,
        apiUserId:     this.apiUserId,
        apiKey:        this.apiKey,
        paymentMethod: 'MWALLET_ACCOUNT',
        payerInfo: {
          accountNo: params.phoneNumber,
        },
        transactionInfo: {
          referenceId:     invoiceId,
          invoiceId:       invoiceId,
          amount:          params.amount.toString(),
          currency:        params.currency,
          description:     params.description,
        },
      },
    };

    this.logger.log(`[WaafiPay] PreAuthorize: ${params.phoneNumber} — ${params.amount} ${params.currency}`);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;
      this.logger.log(`[WaafiPay] Response: ${JSON.stringify(data?.params?.state)}`);

      const success = data?.params?.state === 'APPROVED' || data?.responseCode === '2001';
      const forApproval = data?.params?.state === 'forApproval';

      // Sauvegarder la transaction en DB
      await this.prisma.payment.create({
        data: {
          userId:    params.userId,
          courseId:  params.courseId,
          provider:  'WAAFI' as any,
          amount:    params.amount,
          currency:  params.currency,
          status:    forApproval ? 'PENDING' : (success ? 'COMPLETED' : 'FAILED'),
          metadata:  {
            requestId,
            invoiceId,
            waafiTransactionId: data?.params?.transactionId || null,
            phoneNumber: params.phoneNumber,
            waafiResponse: data,
          } as any,
        },
      }).catch(() => {}); // Non bloquant si le schema ne supporte pas encore

      return {
        success: success || forApproval,
        requestId,
        transactionId: data?.params?.transactionId,
        invoiceId,
        status: forApproval ? 'forApproval' : (success ? 'APPROVED' : 'FAILED'),
        message: forApproval
          ? 'Demande envoyee a votre telephone. Confirmez sur votre app Waafi/Salaam.'
          : success
            ? 'Paiement approuve automatiquement.'
            : data?.responseMsg || 'Echec du paiement.',
      };
    } catch (err) {
      this.logger.error(`[WaafiPay] PreAuthorize error: ${err.message}`);
      throw new BadRequestException(`Erreur WaafiPay: ${err.message}`);
    }
  }

  // ─── Commit — Etape 2 : valider apres confirmation ─────────────────────────

  async commit(params: {
    requestId: string;
    transactionId: string;
    description: string;
  }): Promise<WaafiCommitResult> {
    if (!this.isConfigured) {
      throw new BadRequestException('WaafiPay non configure.');
    }

    const payload = {
      schemaVersion: '1.0',
      requestId:     uuidv4(),
      timestamp:     new Date().toISOString(),
      channelName:   'WEB',
      serviceName:   'API_PREAUTHORIZE_COMMIT',
      serviceParams: {
        merchantUid:   this.merchantUid,
        apiUserId:     this.apiUserId,
        apiKey:        this.apiKey,
        transactionId: params.transactionId,
        description:   params.description,
      },
    };

    this.logger.log(`[WaafiPay] Commit: transactionId=${params.transactionId}`);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;
      const success = data?.responseCode === '2001' || data?.params?.state === 'APPROVED';

      this.logger.log(`[WaafiPay] Commit result: ${success ? 'SUCCESS' : 'FAILED'}`);

      return {
        success,
        transactionId: params.transactionId,
        amount:    parseFloat(data?.params?.txAmount || '0'),
        currency:  data?.params?.currency || 'USD',
        message:   success ? 'Paiement valide avec succes !' : (data?.responseMsg || 'Validation echouee.'),
      };
    } catch (err) {
      this.logger.error(`[WaafiPay] Commit error: ${err.message}`);
      throw new BadRequestException(`Erreur commit WaafiPay: ${err.message}`);
    }
  }

  // ─── Annuler une transaction en attente ─────────────────────────────────────

  async cancel(transactionId: string): Promise<void> {
    if (!this.isConfigured) return;

    const payload = {
      schemaVersion: '1.0',
      requestId:     uuidv4(),
      timestamp:     new Date().toISOString(),
      channelName:   'WEB',
      serviceName:   'API_PREAUTHORIZE_CANCEL',
      serviceParams: {
        merchantUid:   this.merchantUid,
        apiUserId:     this.apiUserId,
        apiKey:        this.apiKey,
        transactionId,
        description:   'Annulation par l utilisateur',
      },
    };

    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  // ─── Verifier si WaafiPay est configure ─────────────────────────────────────

  getStatus() {
    return {
      configured: this.isConfigured,
      sandbox:    this.isSandbox,
      endpoint:   this.endpoint,
      providers:  ['WAAFI', 'ZAAD', 'EVCPlus', 'SAHAL'],
    };
  }
}
