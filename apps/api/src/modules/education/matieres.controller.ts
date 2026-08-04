import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { EducationService } from './education.service';

@ApiTags('education')
@Controller('matieres')
export class MatieresController {
  constructor(private readonly eduService: EducationService) {}

  // Doit être déclaré avant ':id' — sinon NestJS matcherait 'stats-globales'
  // comme un identifiant de matière.
  @Get('stats-globales')
  @Public()
  @ApiOperation({ summary: 'Totaux réels (chapitres/exercices) par matière, tous niveaux confondus' })
  getStatsGlobales() {
    return this.eduService.getStatsGlobalesParMatiere();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Matière avec ses chapitres' })
  findOne(@Param('id') id: string) {
    return this.eduService.getMatiereById(id);
  }

  @Get('niveau/:niveauId')
  @Public()
  @ApiOperation({ summary: 'Toutes les matières d\'un niveau' })
  findByNiveau(@Param('niveauId') niveauId: string) {
    return this.eduService.getMatieresByNiveau(niveauId);
  }
}
