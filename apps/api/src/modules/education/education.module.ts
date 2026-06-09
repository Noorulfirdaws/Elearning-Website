import { Module } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { NiveauxController } from './niveaux.controller';
import { MatieresController } from './matieres.controller';
import { ChapitresController } from './chapitres.controller';
import { EducationService } from './education.service';

@Module({
  controllers: [NiveauxController, MatieresController, ChapitresController],
  providers: [EducationService, PrismaService],
  exports: [EducationService],
})
export class EducationModule {}
