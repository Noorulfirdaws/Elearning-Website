import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma.service';

/**
 * Tâches planifiées pour les abonnements mensuels LearnHub Djibouti
 * ──────────────────────────────────────────────────────────────────
 * - Rappel automatique 2 jours avant expiration
 * - Coupure d'accès automatique à la date d'expiration
 */
@Injectable()
export class AchatCron {
  private readonly logger = new Logger(AchatCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chaque jour à 8h00 — envoyer des rappels pour les abonnements
   * qui expirent dans 2 jours (ou moins).
   */
  @Cron('0 8 * * *') // Tous les jours à 8h00
  async envoyerRappelsExpiration() {
    const dans2Jours = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const maintenant = new Date();

    // Abonnements qui expirent dans les 2 prochains jours et sont encore VALIDE
    const aExpirer = await this.prisma.achat.findMany({
      where: {
        status: 'VALIDE',
        expiresAt: {
          gte: maintenant,
          lte: dans2Jours,
        },
        // Pas déjà rappelé dans les dernières 24h
        NOT: {
          metadata: { path: ['rappelEnvoye'], equals: true },
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
      },
      take: 200,
    });

    this.logger.log(`[Rappel] ${aExpirer.length} abonnement(s) expirent dans ≤2 jours`);

    for (const achat of aExpirer) {
      const jours = Math.ceil((new Date(achat.expiresAt!).getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24));

      this.logger.log(
        `[Rappel] 🔔 ${achat.user.email} — ${achat.typeAcces} expire dans ${jours}j (${achat.expiresAt?.toISOString()})`,
      );

      // TODO: Envoyer SMS Waafi ou email SMTP ici quand configuré
      // await this.smsService.send(achat.user.phone, `Votre accès LearnHub expire dans ${jours} jour(s). Renouvelez sur learnhub.dj`);

      // Marquer comme rappelé
      await this.prisma.achat.update({
        where: { id: achat.id },
        data: { metadata: { ...(achat.metadata as any), rappelEnvoye: true } },
      });
    }
  }

  /**
   * Chaque heure — couper l'accès aux abonnements expirés.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async couperAccesExpires() {
    const maintenant = new Date();

    const { count } = await this.prisma.achat.updateMany({
      where: {
        status: 'VALIDE',
        expiresAt: { lt: maintenant },
      },
      data: { status: 'ECHOUE' }, // ECHOUE = accès coupé
    });

    if (count > 0) {
      this.logger.log(`[Expiration] ✂️ ${count} abonnement(s) expiré(s) — accès coupé`);
    }
  }

  /**
   * Renvoie la liste des abonnements qui expirent bientôt (pour le dashboard admin).
   */
  async getAbonnementsExpirantBientot(jours = 7) {
    const limite = new Date(Date.now() + jours * 24 * 60 * 60 * 1000);
    return this.prisma.achat.findMany({
      where: {
        status: 'VALIDE',
        expiresAt: { lte: limite, gte: new Date() },
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { expiresAt: 'asc' },
      take: 50,
    });
  }
}
