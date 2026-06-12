import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaService } from '../../config/prisma.service';
import { NiveauxController } from './niveaux.controller';
import { MatieresController } from './matieres.controller';
import { ChapitresController } from './chapitres.controller';
import { FichiersController } from './fichiers.controller';
import { EducationService } from './education.service';

@Module({
  imports: [MulterModule.register({ dest: './public/uploads/chapitres' })],
  controllers: [NiveauxController, MatieresController, ChapitresController, FichiersController],
  providers: [EducationService, PrismaService],
  exports: [EducationService],
})
export class EducationModule {}
