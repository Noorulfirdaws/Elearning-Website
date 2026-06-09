/**
 * DMoneyService
 * =============
 * Integration avec D-Money (Djibouti Telecom)
 *
 * STATUT : Pret a connecter — en attente des credentials Djibouti Telecom
 *
 * Pour activer :
 *  1. Contacter Djibouti Telecom Business : https://d-money.dj
 *  2. Demander les credentials API marchand
 *  3. Ajouter dans apps/api/.env :
 *     DMONEY_API_URL=https://api.d-money.dj
 *     DMONEY_MERCHANT_ID=votre_id
 *     DMONEY_API_KEY=votre_cle
 *     DMONEY_SANDBOX=true
 *
 * La structure du service suit le meme pattern que WaafiPayService.
 * Quand Djibouti Telecom fournit la documentation API, il suffit
 * de remplir les methodes ci-dessous.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DMoneyPaymentResult {
  success: boolean;
  transactionId?: string;
  status: 'PENDING' | 'APPROVED' | 'FAILED';
  message: string;
}

@Injectable()
export class DMoneyService {
  private readonly logger = new Logger(DMoneyService.name);

  constructor(private config: ConfigService) {}

  private get apiUrl(): string {
    return this.config.get('app.dmoney.apiUrl') || 'https://api.d-money.dj';
  }

  private get merchantId(): string {
    return this.config.get('app.dmoney.merchantId') || '';
  }

  private get apiKey(): string {
    return this.config.get('app.dmoney.apiKey') || '';
  }

  private get isConfigured(): boolean {
    return !!(this.merchantId && this.apiKey);
  }

  /**
   * Initier un paiement D-Money
   * L'eleve recoit une notification sur son app D-Money pour confirmer
   */
  async initiatePayment(params: {
    phoneNumber: string;  // Numero Djibouti Telecom ex: "77XXXXXX"
    amount: number;
    currency: 'DJF' | 'USD';
    description: string;
    orderId: string;
  }): Promise<DMoneyPaymentResult> {
    if (!this.isConfigured) {
      this.logger.warn('[D-Money] Non configure — credentials manquants dans .env');
      return {
        success: false,
        status: 'FAILED',
        message:
          'D-Money non configure. Contactez Djibouti Telecom pour obtenir vos credentials API.',
      };
    }

    /**
     * TODO : Implementer quand Djibouti Telecom fournit la documentation
     *
     * Exemple probable (structure typique mobile money) :
     *
     * const response = await fetch(`${this.apiUrl}/payment/initiate`, {
     *   method: 'POST',
     *   headers: {
     *     'Content-Type': 'application/json',
     *     'Authorization': `Bearer ${this.apiKey}`,
     *     'X-Merchant-ID': this.merchantId,
     *   },
     *   body: JSON.stringify({
     *     msisdn:      params.phoneNumber,
     *     amount:      params.amount,
     *     currency:    params.currency,
     *     reference:   params.orderId,
     *     description: params.description,
     *     callback_url: process.env.API_URL + '/payments/dmoney/callback',
     *   }),
     * });
     */

    this.logger.warn('[D-Money] Methode initiatePayment a implementer');
    return {
      success: false,
      status: 'FAILED',
      message: 'D-Money : implementation en cours. Utilisez WaafiPay pour le moment.',
    };
  }

  /**
   * Verifier le statut d'une transaction
   */
  async checkStatus(transactionId: string): Promise<DMoneyPaymentResult> {
    if (!this.isConfigured) {
      return { success: false, status: 'FAILED', message: 'D-Money non configure.' };
    }

    /**
     * TODO : GET ${this.apiUrl}/payment/status/${transactionId}
     */

    return { success: false, status: 'FAILED', message: 'Non implemente.' };
  }

  /**
   * Webhook de confirmation D-Money
   * Djibouti Telecom appellera cette URL quand le paiement est confirme
   */
  async handleWebhook(payload: any): Promise<{ received: boolean }> {
    this.logger.log('[D-Money] Webhook recu:', JSON.stringify(payload));

    /**
     * TODO : Verifier la signature du webhook
     * TODO : Extraire transactionId, status, amount
     * TODO : Mettre a jour la DB et creer l'enrollment
     */

    return { received: true };
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      message: this.isConfigured
        ? 'D-Money configure et pret'
        : 'D-Money en attente de credentials Djibouti Telecom',
      contact: 'https://d-money.dj / direction.commerciale@djiboutitelecom.dj',
    };
  }
}
