/**
 * PermissionsTokenService
 * =======================
 * Génère et vérifie des tokens de permissions HMAC-signés pour le cache offline.
 *
 * Principe Zero-Trust offline :
 *   - Le serveur signe les permissions avec HMAC-SHA256
 *   - Le token est opaque pour le client (il peut lire le payload mais pas le modifier)
 *   - Modifier le payload invalide la signature → le serveur rejette à la reconnexion
 *   - Le token expire après 7 jours → force une resynchronisation hebdomadaire
 *
 * Format du token :
 *   base64url(header) . base64url(payload) . base64url(hmac)
 *
 * Différence avec JWT standard :
 *   - Algorithme fixe : HS256 (pas de "alg: none" possible — attaque JWT classique)
 *   - userId lié à la signature → un token d'un user A ne peut pas servir à user B
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PermissionsPayload {
  sub:       string;    // userId
  chapitres: string[];
  classes:   string[];
  examens:   string[];
  iat:       number;    // issued at (unix ms)
  exp:       number;    // expires at (unix ms)
}

export interface PermissionsTokenResult {
  token:    string;               // opaque string à stocker tel quel
  payload:  PermissionsPayload;   // décodé pour usage immédiat côté front
  expiresAt: string;              // ISO string pour affichage
}

@Injectable()
export class PermissionsTokenService {
  private readonly logger = new Logger(PermissionsTokenService.name);

  // Durée de validité du token offline : 7 jours
  private readonly TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(private config: ConfigService) {}

  private get secret(): string {
    const s = this.config.get<string>('OFFLINE_PERMS_SECRET');
    if (!s) {
      throw new Error('OFFLINE_PERMS_SECRET manquant dans .env — REQUIS pour la sécurité paywall');
    }
    if (s.length < 32) {
      throw new Error('OFFLINE_PERMS_SECRET trop court (minimum 32 caractères)');
    }
    return s;
  }

  /**
   * Signe les permissions d'un utilisateur.
   * Appelé après connexion et après chaque achat.
   */
  sign(userId: string, perms: {
    chapitres: string[];
    classes:   string[];
    examens:   string[];
  }): PermissionsTokenResult {
    const now = Date.now();
    const exp = now + this.TTL_MS;

    const payload: PermissionsPayload = {
      sub:       userId,
      chapitres: perms.chapitres,
      classes:   perms.classes,
      examens:   perms.examens,
      iat:       now,
      exp,
    };

    const headerB64  = this.toB64(JSON.stringify({ alg: 'HS256', typ: 'PERMS' }));
    const payloadB64 = this.toB64(JSON.stringify(payload));
    const sig        = this.hmac(`${headerB64}.${payloadB64}`, userId);

    const token = `${headerB64}.${payloadB64}.${sig}`;

    this.logger.log(`[PermissionsToken] Signé pour user=${userId} (expire le ${new Date(exp).toISOString()})`);

    return {
      token,
      payload,
      expiresAt: new Date(exp).toISOString(),
    };
  }

  /**
   * Vérifie l'authenticité et la validité d'un token.
   * Retourne null si invalide ou expiré.
   */
  verify(token: string, userId: string): PermissionsPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, receivedSig] = parts;

      // 1. Vérifier la signature (constant-time pour éviter timing attacks)
      const expectedSig = this.hmac(`${headerB64}.${payloadB64}`, userId);
      const sigOk = crypto.timingSafeEqual(
        Buffer.from(receivedSig, 'base64url'),
        Buffer.from(expectedSig, 'base64url'),
      );
      if (!sigOk) {
        this.logger.warn(`[PermissionsToken] Signature invalide pour user=${userId}`);
        return null;
      }

      // 2. Décoder le payload
      const payload: PermissionsPayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      );

      // 3. Vérifier que le token appartient bien à cet utilisateur
      if (payload.sub !== userId) {
        this.logger.warn(`[PermissionsToken] Token d'un autre user (attendu=${userId}, reçu=${payload.sub})`);
        return null;
      }

      // 4. Vérifier l'expiration
      if (Date.now() > payload.exp) {
        this.logger.log(`[PermissionsToken] Token expiré pour user=${userId}`);
        return null;
      }

      return payload;

    } catch (err) {
      this.logger.error(`[PermissionsToken] Erreur vérification: ${err.message}`);
      return null;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private toB64(str: string): string {
    return Buffer.from(str, 'utf8').toString('base64url');
  }

  private hmac(data: string, userId: string): string {
    // Clé = secret global + userId (lie le token à l'utilisateur)
    const key = `${this.secret}:${userId}`;
    return crypto.createHmac('sha256', key).update(data).digest('base64url');
  }
}
