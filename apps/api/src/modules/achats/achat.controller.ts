/**
 * AchatController
 * ===============
 * Routes pour les achats et droits d'acces LearnHub Djibouti.
 *
 * Routes publiques :
 *   GET  /achats/verifier/:chapitreId   — verifier l'acces a un chapitre
 *
 * Routes protegees (JWT) :
 *   GET  /achats/mes-achats              — liste des achats valides de l'utilisateur
 *   GET  /achats/permissions-offline     — permissions compactes pour cache IndexedDB
 *   POST /achats/initier                 — creer un achat EN_ATTENTE + lancer Waafi
 *   POST /achats/valider                 — valider apres confirmation paiement
 *   POST /achats/annuler                 — annuler un achat EN_ATTENTE
 *
 * Routes admin :
 *   POST /achats/admin/offrir            — accorder acces gratuit manuellement
 */

import {
  Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, TypeAcces } from '@prisma/client';
import { AchatService, PRIX_DJF } from './achat.service';
import { WaafiPayService } from '../payments/waafi-pay.service';
import { InitierAchatDto, ValiderAchatDto, AnnulerAchatDto, OffrirAccesDto } from './achat.dto';

@ApiTags('achats')
@Controller('achats')
export class AchatController {
  constructor(
    private readonly achatService: AchatService,
    private readonly waafi: WaafiPayService,
  ) {}

  // ─── Acces libre ──────────────────────────────────────────────────────────

  /**
   * Verifier si l'utilisateur courant peut lire un chapitre.
   * Public : renvoie autorise=false si pas de token (sauf chapitres gratuits).
   */
  @Get('verifier/:chapitreId')
  @Public()
  @ApiOperation({ summary: "Verifier l'acces a un chapitre" })
  @ApiParam({ name: 'chapitreId', example: 'c3-maths-pythagore' })
  async verifier(
    @Param('chapitreId') chapitreId: string,
    @CurrentUser('id') userId?: string,
  ) {
    const result = await this.achatService.verifierAccesChapitre(userId, chapitreId);
    return {
      chapitreId,
      ...result,
      tarifs: PRIX_DJF,  // inclus pour que le front puisse afficher les prix
    };
  }

  // ─── Protege JWT ──────────────────────────────────────────────────────────

  @Get('mes-achats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Liste des achats valides de l'utilisateur" })
  getMesAchats(@CurrentUser('id') userId: string) {
    return this.achatService.getMesAchats(userId);
  }

  /**
   * Permissions compactes pour cache offline IndexedDB.
   * Le frontend appelle cette route a la connexion et stocke le JSON dans IndexedDB.
   * Cela permet de verifier l'acces hors ligne.
   */
  @Get('permissions-offline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permissions compactes pour cache hors-ligne' })
  getPermissionsOffline(@CurrentUser('id') userId: string) {
    return this.achatService.getPermissionsOffline(userId);
  }

  /**
   * Initier un achat via WaafiPay.
   * 1. Cree l'achat EN_ATTENTE en DB
   * 2. Lance la PreAuthorize Waafi (envoie USSD au telephone)
   * 3. Retourne le requestId + transactionId pour le polling frontend
   */
  @Post('initier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initier un achat via WaafiPay' })
  async initierAchat(
    @CurrentUser('id') userId: string,
    @Body() body: InitierAchatDto,
  ) {
    const { typeAcces, itemId, phoneNumber, provider = 'WAAFI' } = body;

    const montantDJF = PRIX_DJF[typeAcces];

    // Description lisible
    const descriptions: Record<TypeAcces, string> = {
      CHAPITRE: `LearnHub - Acces chapitre (${itemId})`,
      CLASSE:   `LearnHub - Acces classe complete (${itemId})`,
      EXAMEN:   `LearnHub - Pack Examen ${itemId} (preparation approfondie)`,
    };

    // Lancer WaafiPay PreAuthorize
    const waafiResult = await this.waafi.preAuthorize({
      phoneNumber: phoneNumber.replace(/\s+/g, '').replace(/^\+/, ''),
      amount:      montantDJF,
      currency:    'SLSH', // Franc Djiboutien (Somali Shilling equivalent local)
      description: descriptions[typeAcces],
      courseId:    itemId,
      userId,
    });

    if (!waafiResult.success) {
      return { success: false, message: waafiResult.message };
    }

    // Creer l'achat EN_ATTENTE en DB
    const achat = await this.achatService.creerAchatEnAttente({
      userId,
      typeAcces,
      itemId,
      provider,
      transactionId:  waafiResult.transactionId,
      waafiRequestId: waafiResult.requestId,
      metadata:       { phoneNumber, montantDJF },
    });

    return {
      success:       true,
      achatId:       achat.id,
      requestId:     waafiResult.requestId,
      transactionId: waafiResult.transactionId,
      montantDJF,
      message:       'Confirmez le paiement sur votre telephone (USSD Waafi).',
    };
  }

  /**
   * Valider l'achat après confirmation téléphone.
   *
   * SÉCURITÉ ANTI-REPLAY :
   *   1. On récupère l'achat EN_ATTENTE depuis la DB (créé par /achats/initier)
   *   2. On vérifie que le requestId/transactionId correspondent à CE QUI A ÉTÉ CRÉÉ
   *      (pas ce que le client envoie)
   *   3. Si l'achat est DÉJÀ VALIDE → retourner les permissions (idempotence)
   *   4. Si le transactionId du client ne correspond pas à la DB → REFUSER
   *
   * Un attaquant qui réutilise un transactionId d'une autre transaction sera bloqué
   * en étape 4 car le transactionId ne correspondra pas à l'enregistrement DB.
   */
  @Post('valider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider un achat après confirmation Waafi (anti-replay)' })
  async validerAchat(
    @CurrentUser('id') userId: string,
    @Body() body: ValiderAchatDto,
  ) {
    // ── ÉTAPE 0 : Charger l'achat DEPUIS LA BASE DE DONNÉES ────────────────
    // On ne fait JAMAIS confiance aux IDs envoyés par le client
    const achatEnDB = await this.achatService.getAchatEnAttente(
      userId, body.typeAcces, body.itemId,
    );

    if (!achatEnDB) {
      // Cas idempotent : l'achat est peut-être déjà VALIDE (double-clic)
      const achatValide = await this.achatService.getAchatValide(
        userId, body.typeAcces, body.itemId,
      );
      if (achatValide) {
        const permissions = await this.achatService.getPermissionsOffline(userId);
        return { success: true, achat: achatValide, permissions, message: 'Accès déjà débloqué.' };
      }
      throw new BadRequestException('Aucun achat en attente trouvé pour cet article.');
    }

    // ── ÉTAPE 1 : ANTI-REPLAY — Vérifier que les IDs correspondent à la DB ─
    // Le transactionId et requestId doivent correspondre à ce qui a été créé
    // lors du /achats/initier — pas ce que le client prétend envoyer
    if (achatEnDB.waafiRequestId && achatEnDB.waafiRequestId !== body.requestId) {
      throw new BadRequestException('requestId invalide — ne correspond pas à la transaction initiée.');
    }
    if (achatEnDB.transactionId && achatEnDB.transactionId !== body.transactionId) {
      throw new BadRequestException('transactionId invalide — tentative de replay détectée.');
    }

    // ── ÉTAPE 2 : Appeler WaafiPay Commit avec les IDs DE LA BASE ──────────
    // On utilise les IDs de la DB, pas ceux du client
    const commitResult = await this.waafi.commit({
      requestId:     achatEnDB.waafiRequestId || body.requestId,
      transactionId: achatEnDB.transactionId  || body.transactionId,
      description:   `LearnHub Djibouti - ${body.typeAcces} ${body.itemId}`,
    });

    if (!commitResult.success) {
      await this.achatService.marquerEchoue(userId, body.typeAcces, body.itemId);
      return { success: false, message: commitResult.message };
    }

    // ── ÉTAPE 3 : Valider en DB (idempotent — upsert vers VALIDE) ──────────
    const achat = await this.achatService.validerAchat({
      userId,
      typeAcces:     body.typeAcces,
      itemId:        body.itemId,
      transactionId: achatEnDB.transactionId || body.transactionId,
    });

    // ── ÉTAPE 4 : Retourner les permissions signées HMAC ───────────────────
    const permissions = await this.achatService.getPermissionsOffline(userId);

    return {
      success:     true,
      achat,
      permissions, // token signé HMAC — le front met à jour IndexedDB
      message:     'Accès débloqué ! Bon apprentissage.',
    };
  }

  @Post('annuler')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler un achat en attente' })
  async annulerAchat(
    @CurrentUser('id') userId: string,
    @Body() body: AnnulerAchatDto,
  ) {
    if (body.transactionId) {
      await this.waafi.cancel(body.transactionId);
    }
    await this.achatService.marquerEchoue(userId, body.typeAcces, body.itemId);
    return { success: true, message: 'Achat annule.' };
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Post('admin/offrir')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accorder acces gratuit a un utilisateur (admin)' })
  async offrir(
    @Body() body: OffrirAccesDto,
  ) {
    const achat = await this.achatService.accorderAccesGratuit({
      userId:    body.userId,
      typeAcces: body.typeAcces,
      itemId:    body.itemId,
      adminNote: body.note,
    });
    return { success: true, achat };
  }
}
