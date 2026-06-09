import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { EducationService } from './education.service';

@ApiTags('education')
@Controller('niveaux')
export class NiveauxController {
  constructor(private readonly eduService: EducationService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Tous les niveaux scolaires' })
  findAll() {
    return this.eduService.getAllNiveaux();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Niveau avec ses matières' })
  findOne(@Param('id') id: string) {
    return this.eduService.getNiveauById(id);
  }
}
