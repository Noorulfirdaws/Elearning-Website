import {
  Controller, Post, Delete, Get, Param, Body, UseGuards,
  UseInterceptors, UploadedFile, Req, Res, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard }   from '../../common/guards/roles.guard';
import { Roles }        from '../../common/decorators/roles.decorator';
import { CurrentUser }  from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../config/prisma.service';
import { UserRole }     from '@prisma/client';

// Types de fichiers autorisés
const MIME_TYPES_AUTORISES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/webp',
];

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const ICONES_TYPE: Record<string, string> = {
  'pdf':  '📄', 'doc': '📝', 'docx': '📝',
  'xls':  '📊', 'xlsx': '📊',
  'ppt':  '📋', 'pptx': '📋',
  'jpg':  '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'webp': '🖼️',
};

@Controller('chapitres')
@UseGuards(JwtAuthGuard)
export class FichiersController {
  constructor(private prisma: PrismaService) {}

  // ─── Upload d'un fichier ──────────────────────────────────────────────────
  @Post(':id/fichiers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @UseInterceptors(
    FileInterceptor('fichier', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = join(process.cwd(), 'public', 'uploads', 'chapitres', req.params.id);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ts   = Date.now();
          const ext  = extname(file.originalname);
          const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 80);
          cb(null, `${ts}_${safe}`);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (req, file, cb) => {
        if (MIME_TYPES_AUTORISES.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Type de fichier non autorisé'), false);
      },
    }),
  )
  async uploadFichier(
    @Param('id') chapitreId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('nom') nomCustom: string,
    @Body('acces') acces: string = 'CLASSE',
  ) {
    if (!file) throw new NotFoundException('Aucun fichier reçu');

    const chapitre = await this.prisma.chapitre.findUnique({ where: { id: chapitreId } });
    if (!chapitre) throw new NotFoundException('Chapitre introuvable');

    const ext      = extname(file.originalname).replace('.', '').toLowerCase();
    const icone    = ICONES_TYPE[ext] || '📎';
    const fichiers = (chapitre.fichiers as any[]) || [];

    const nouveau = {
      id:       `${Date.now()}`,
      nom:      nomCustom || file.originalname,
      fichier:  file.filename,
      type:     ext,
      icone,
      taille:   file.size,
      acces:    ['GRATUIT', 'CHAPITRE', 'CLASSE'].includes(acces) ? acces : 'CLASSE',
      uploadedAt: new Date().toISOString(),
    };

    fichiers.push(nouveau);

    await this.prisma.chapitre.update({
      where: { id: chapitreId },
      data:  { fichiers },
    });

    return { success: true, data: nouveau };
  }

  // ─── Supprimer un fichier ─────────────────────────────────────────────────
  @Delete(':id/fichiers/:fichierId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  async deleteFichier(
    @Param('id') chapitreId: string,
    @Param('fichierId') fichierId: string,
  ) {
    const chapitre = await this.prisma.chapitre.findUnique({ where: { id: chapitreId } });
    if (!chapitre) throw new NotFoundException('Chapitre introuvable');

    const fichiers = (chapitre.fichiers as any[]) || [];
    const idx      = fichiers.findIndex(f => f.id === fichierId);
    if (idx === -1) throw new NotFoundException('Fichier introuvable');

    // Supprimer le fichier physique
    const filePath = join(process.cwd(), 'public', 'uploads', 'chapitres', chapitreId, fichiers[idx].fichier);
    try { if (existsSync(filePath)) unlinkSync(filePath); } catch {}

    fichiers.splice(idx, 1);
    await this.prisma.chapitre.update({ where: { id: chapitreId }, data: { fichiers } });

    return { success: true };
  }

  // ─── Télécharger un fichier (avec vérification d'accès) ──────────────────
  @Get(':id/fichiers/:fichierId/download')
  async downloadFichier(
    @Param('id') chapitreId: string,
    @Param('fichierId') fichierId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const chapitre = await this.prisma.chapitre.findUnique({
      where: { id: chapitreId },
      include: { matiere: { include: { niveau: true } } },
    });
    if (!chapitre) throw new NotFoundException('Chapitre introuvable');

    const fichiers = (chapitre.fichiers as any[]) || [];
    const fichier  = fichiers.find(f => f.id === fichierId);
    if (!fichier) throw new NotFoundException('Fichier introuvable');

    // Vérification d'accès selon le niveau du fichier
    if (fichier.acces !== 'GRATUIT') {
      if (!user) throw new ForbiddenException('Connexion requise');

      // SUPER_ADMIN et ADMIN ont toujours accès
      if (![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role)) {
        const niveauId = chapitre.matiere?.niveau?.id;

        // Vérifier achat CLASSE (5000 DJF) ou CHAPITRE (1000 DJF)
        const achat = await this.prisma.achat.findFirst({
          where: {
            userId: user.id,
            statut: 'VALIDE',
            OR: [
              { typeAcces: 'CLASSE',   itemId: niveauId },
              { typeAcces: 'CHAPITRE', itemId: chapitreId },
              { typeAcces: 'EXAMEN' },
            ],
          },
        });

        if (!achat && fichier.acces === 'CLASSE') {
          throw new ForbiddenException('Accès Classe (5 000 DJF) requis pour télécharger ce fichier');
        }
        if (!achat && fichier.acces === 'CHAPITRE') {
          throw new ForbiddenException('Accès Chapitre requis pour télécharger ce fichier');
        }
      }
    }

    const filePath = join(process.cwd(), 'public', 'uploads', 'chapitres', chapitreId, fichier.fichier);
    if (!existsSync(filePath)) throw new NotFoundException('Fichier introuvable sur le serveur');

    res.download(filePath, fichier.nom);
  }
}
