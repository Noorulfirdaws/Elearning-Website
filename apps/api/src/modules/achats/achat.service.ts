/**
 * AchatService
 * ============
 * Logique metier des achats et droits d'acces LearnHub Djibouti.
 *
 * Grille tarifaire :
 *   CHAPITRE  1 000 DJF -> 1 chapitre specifique
 *   CLASSE    5 000 DJF -> tous les chapitres d'un niveau (ex: 3eme)
 *   EXAMEN   10 000 DJF -> pack preparation Brevet ou Bac
 *
 * Regles d'acces gratuit :
 *   - Le PREMIER chapitre de chaque matiere est toujours gratuit
 *   - Les utilisateurs INSTRUCTOR/ADMIN/SUPER_ADMIN ont acces a tout
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { TypeAcces, StatutAchat, UserRole } from '@prisma/client';
import { PermissionsTokenService } from './permissions-token.service';

export const PRIX_DJF: Record<TypeAcces, number> = {
  CHAPITRE: 1000,
  CLASSE:   5000,
  EXAMEN:  10000,
};

export interface AccesResult {
  autorise: boolean;
  raison: 'GRATUIT' | 'ACHAT_VALIDE' | 'ACCES_CLASSE' | 'ACCES_EXAMEN' | 'ROLE_ADMIN' | 'NON_ACHETE';
  achat?: { id: string; typeAcces: TypeAcces; montantDJF: number; createdAt: Date };
}

@Injectable()
export class AchatService {
  private readonly logger = new Logger(AchatService.name);

  constructor(
    private prisma: PrismaService,
    private permissionsToken: PermissionsTokenService,
  ) {}

  // ─── Verification d'acces ──────────────────────────────────────────────────

  /**
   * Verifie si un utilisateur a acces a un chapitre donne.
   * Hierarchie : GRATUIT > ROLE_ADMIN > ACHAT_VALIDE (CHAPITRE ou CLASSE ou EXAMEN)
   */
  async verifierAccesChapitre(userId: string | undefined, chapitreId: string): Promise<AccesResult> {
    // 1. Recuperer le chapitre pour connaitre sa matiere et son ordre
    const chapitre = await this.prisma.chapitre.findUnique({
      where: { id: chapitreId },
      select: { ordre: true, matiereId: true, matiere: { select: { niveauId: true } } },
    });

    if (!chapitre) {
      return { autorise: false, raison: 'NON_ACHETE' };
    }

    // 2. Chapitres ordre=1 sont gratuits pour tous
    if (chapitre.ordre === 1) {
      return { autorise: true, raison: 'GRATUIT' };
    }

    // 3. Utilisateur non connecte -> acces refuse (sauf ordre=1 deja gere)
    if (!userId) {
      return { autorise: false, raison: 'NON_ACHETE' };
    }

    // 4. Instructeur / Admin -> acces total
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user && [UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) {
      return { autorise: true, raison: 'ROLE_ADMIN' };
    }

    const niveauId = chapitre.matiere.niveauId;

    const maintenant = new Date();

    // Helper : vérifie si un achat est valide ET non expiré
    const estValide = (achat: any) =>
      achat?.status === StatutAchat.VALIDE &&
      (!achat.expiresAt || new Date(achat.expiresAt) > maintenant);

    // 5. Verifier si achat CHAPITRE specifique
    const achatChapitre = await this.prisma.achat.findUnique({
      where: {
        userId_typeAcces_itemId: { userId, typeAcces: TypeAcces.CHAPITRE, itemId: chapitreId },
      },
    });
    if (estValide(achatChapitre)) {
      return { autorise: true, raison: 'ACHAT_VALIDE', achat: achatChapitre as any };
    }

    // 6. Verifier si achat CLASSE (acces a toute la classe = niveauId)
    const achatClasse = await this.prisma.achat.findUnique({
      where: {
        userId_typeAcces_itemId: { userId, typeAcces: TypeAcces.CLASSE, itemId: niveauId },
      },
    });
    if (estValide(achatClasse)) {
      return { autorise: true, raison: 'ACCES_CLASSE', achat: achatClasse as any };
    }

    // 7. Verifier si achat EXAMEN (BREVET pour college, BAC pour lycee)
    const cycleExamen = niveauId.startsWith('L') ? 'BAC' : 'BREVET';
    const achatExamen = await this.prisma.achat.findUnique({
      where: {
        userId_typeAcces_itemId: { userId, typeAcces: TypeAcces.EXAMEN, itemId: cycleExamen },
      },
    });
    if (estValide(achatExamen)) {
      return { autorise: true, raison: 'ACCES_EXAMEN', achat: achatExamen as any };
    }

    return { autorise: false, raison: 'NON_ACHETE' };
  }

  /**
   * Verifie si un utilisateur a acces a tous les chapitres d'un niveau.
   */
  async verifierAccesClasse(userId: string, niveauId: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user && [UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role)) return true;

    const achat = await this.prisma.achat.findUnique({
      where: { userId_typeAcces_itemId: { userId, typeAcces: TypeAcces.CLASSE, itemId: niveauId } },
    });
    return achat?.status === StatutAchat.VALIDE;
  }

  // ─── Creation d'achat en attente ──────────────────────────────────────────

  async creerAchatEnAttente(params: {
    userId: string;
    typeAcces: TypeAcces;
    itemId: string;
    provider: string;
    transactionId?: string;
    waafiRequestId?: string;
    metadata?: Record<string, any>;
  }) {
    const montantDJF = PRIX_DJF[params.typeAcces];

    // Upsert : si un achat ECHOUE existait, on le remet EN_ATTENTE
    const achat = await this.prisma.achat.upsert({
      where: {
        userId_typeAcces_itemId: {
          userId: params.userId,
          typeAcces: params.typeAcces,
          itemId: params.itemId,
        },
      },
      create: {
        userId:        params.userId,
        typeAcces:     params.typeAcces,
        itemId:        params.itemId,
        montantDJF,
        provider:      params.provider,
        status:        StatutAchat.EN_ATTENTE,
        transactionId: params.transactionId,
        waafiRequestId: params.waafiRequestId,
        metadata:      params.metadata ?? {},
      },
      update: {
        status:        StatutAchat.EN_ATTENTE,
        transactionId: params.transactionId,
        waafiRequestId: params.waafiRequestId,
        provider:      params.provider,
        metadata:      params.metadata ?? {},
      },
    });

    this.logger.log(`[Achat] EN_ATTENTE cree — user=${params.userId} type=${params.typeAcces} item=${params.itemId} montant=${montantDJF} DJF`);
    return achat;
  }

  // ─── Validation d'un achat (apres confirmation paiement) ──────────────────

  async validerAchat(params: {
    userId: string;
    typeAcces: TypeAcces;
    itemId: string;
    transactionId: string;
  }) {
    const achat = await this.prisma.achat.update({
      where: {
        userId_typeAcces_itemId: {
          userId:    params.userId,
          typeAcces: params.typeAcces,
          itemId:    params.itemId,
        },
      },
      data: {
        status:        StatutAchat.VALIDE,
        transactionId: params.transactionId,
        // Abonnement mensuel : accès valable 30 jours
        expiresAt:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`[Achat] VALIDE (30j) — user=${params.userId} type=${params.typeAcces} item=${params.itemId} txId=${params.transactionId} expires=${achat.expiresAt}`);
    return achat;
  }

  async marquerEchoue(userId: string, typeAcces: TypeAcces, itemId: string) {
    try {
      return await this.prisma.achat.update({
        where: { userId_typeAcces_itemId: { userId, typeAcces, itemId } },
        data: { status: StatutAchat.ECHOUE },
      });
    } catch {
      // L'achat n'existait pas encore, rien a faire
    }
  }

  // ─── Lecture ──────────────────────────────────────────────────────────────

  // ─── Anti-Replay : récupération des achats pour vérification ─────────────

  /** Récupère un achat EN_ATTENTE (pour vérification anti-replay avant commit) */
  async getAchatEnAttente(userId: string, typeAcces: TypeAcces, itemId: string) {
    return this.prisma.achat.findUnique({
      where: {
        userId_typeAcces_itemId: { userId, typeAcces, itemId },
      },
      // Ne retourne que si EN_ATTENTE
    }).then(a => (a?.status === 'EN_ATTENTE' ? a : null));
  }

  /** Récupère un achat VALIDE (pour idempotence — double validation) */
  async getAchatValide(userId: string, typeAcces: TypeAcces, itemId: string) {
    return this.prisma.achat.findUnique({
      where: {
        userId_typeAcces_itemId: { userId, typeAcces, itemId },
      },
    }).then(a => (a?.status === 'VALIDE' ? a : null));
  }

  async getMesAchats(userId: string) {
    return this.prisma.achat.findMany({
      where: { userId, status: StatutAchat.VALIDE },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retourne un objet compact pour le cache offline (IndexedDB cote client).
   * Format : { chapitres: string[], classes: string[], examens: string[] }
   */
  /**
   * Retourne un token HMAC-signé pour le cache offline (IndexedDB côté client).
   *
   * SÉCURITÉ : le payload est signé avec HMAC-SHA256(OFFLINE_PERMS_SECRET + userId).
   * Un attaquant qui modifie les permissions dans IndexedDB invalide la signature.
   * Le token expire après 7 jours — force une resynchronisation hebdomadaire.
   *
   * Format : base64url(header).base64url(payload).base64url(hmac)
   */
  async getPermissionsOffline(userId: string) {
    const achats = await this.prisma.achat.findMany({
      where: { userId, status: StatutAchat.VALIDE },
      select: { typeAcces: true, itemId: true },
    });

    const perms = {
      chapitres: [] as string[],
      classes:   [] as string[],
      examens:   [] as string[],
    };

    for (const a of achats) {
      if (a.typeAcces === TypeAcces.CHAPITRE) perms.chapitres.push(a.itemId);
      if (a.typeAcces === TypeAcces.CLASSE)   perms.classes.push(a.itemId);
      if (a.typeAcces === TypeAcces.EXAMEN)   perms.examens.push(a.itemId);
    }

    // ⚡ Signer le token — inaltérable côté client
    return this.permissionsToken.sign(userId, perms);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async accorderAccesGratuit(params: {
    userId: string;
    typeAcces: TypeAcces;
    itemId: string;
    adminNote?: string;
  }) {
    return this.prisma.achat.upsert({
      where: { userId_typeAcces_itemId: { userId: params.userId, typeAcces: params.typeAcces, itemId: params.itemId } },
      create: {
        userId:    params.userId,
        typeAcces: params.typeAcces,
        itemId:    params.itemId,
        montantDJF: 0,
        provider:  'ADMIN',
        status:    StatutAchat.VALIDE,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata:  { note: params.adminNote ?? 'Acces offert par un admin' },
      },
      update: {
        status:    StatutAchat.VALIDE,
        provider:  'ADMIN',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata:  { note: params.adminNote ?? 'Acces offert par un admin' },
      },
    });
  }
}
