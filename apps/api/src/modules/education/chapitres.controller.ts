import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { EducationService } from './education.service';

@ApiTags('education')
@Controller('chapitres')
export class ChapitresController {
  constructor(private readonly eduService: EducationService) {}

  // ─── Recherche globale (doit être avant :id) ────────────────────────────────
  @Get('recherche')
  @Public()
  @ApiOperation({ summary: 'Recherche de chapitres par mot-clé' })
  recherche(
    @Query('q') q: string,
    @Query('niveau') niveauId: string,
    @Query('matiere') matiereId: string,
  ) {
    return this.eduService.rechercheChapitres(q, niveauId, matiereId);
  }

  @Get('matiere/:matiereId')
  @Public()
  @ApiOperation({ summary: 'Chapitres d\'une matière' })
  findByMatiere(@Param('matiereId') matiereId: string) {
    return this.eduService.getChapitresByMatiere(matiereId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Contenu complet d\'un chapitre' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.eduService.getChapitreById(id, userId);
  }

  // ─── Progression élève ───────────────────────────────────────────────────────

  @Post(':id/progression')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sauvegarder la progression d\'un élève sur un chapitre' })
  saveProgression(
    @Param('id') chapitreId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { estComplete?: boolean; scoreQuiz?: number; tempsLecture?: number },
  ) {
    return this.eduService.saveProgression(userId, chapitreId, body);
  }

  @Get('progression/moi')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Progression complète de l\'élève connecté' })
  getMyProgression(@CurrentUser('id') userId: string) {
    return this.eduService.getProgressionEleve(userId);
  }

  // ─── Admin / Instructeur — génération de contenu ────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un chapitre (vide)' })
  create(@Body() body: { id: string; matiereId: string; titre: string; ordre: number; youtubeUrl?: string; isPublished?: boolean }) {
    return this.eduService.createChapitre(body);
  }

  @Post(':id/generer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer le contenu pédagogique d\'un chapitre' })
  async generer(
    @Param('id') id: string,
    @Body() body: { niveau: string; matiere: string; titre: string },
  ) {
    return this.eduService.genererContenuChapitre(id, body.niveau, body.matiere, body.titre);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un chapitre' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.eduService.updateChapitre(id, body);
  }
}
