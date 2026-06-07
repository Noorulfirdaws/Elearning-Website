import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('sections/:sectionId/lessons')
  create(
    @Param('sectionId') sectionId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.lessonsService.create(sectionId, userId, body);
  }

  @Patch('sections/:sectionId/lessons/reorder')
  reorder(
    @Param('sectionId') sectionId: string,
    @CurrentUser('id') userId: string,
    @Body('ids') ids: string[],
  ) {
    return this.lessonsService.reorder(sectionId, userId, ids);
  }

  @Get('lessons/:id')
  findById(@Param('id') id: string) {
    return this.lessonsService.findById(id);
  }

  @Patch('lessons/:id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.lessonsService.update(id, userId, body);
  }

  @Delete('lessons/:id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.lessonsService.delete(id, userId);
  }

  @Post('lessons/:id/resources')
  addResource(
    @Param('id') lessonId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; url: string; type: string },
  ) {
    return this.lessonsService.addResource(lessonId, userId, body);
  }
}
