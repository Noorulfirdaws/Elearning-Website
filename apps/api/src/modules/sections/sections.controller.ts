import { Controller, Get, Post, Patch, Delete, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SectionsService } from './sections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses/:courseId/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  create(
    @Param('courseId') courseId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { title: string; description?: string },
  ) {
    return this.sectionsService.create(courseId, userId, body.title, body.description);
  }

  @Get()
  findAll(@Param('courseId') courseId: string) {
    return this.sectionsService.findByCourse(courseId);
  }

  @Patch('reorder')
  reorder(
    @Param('courseId') courseId: string,
    @CurrentUser('id') userId: string,
    @Body('ids') ids: string[],
  ) {
    return this.sectionsService.reorder(courseId, userId, ids);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.sectionsService.update(id, userId, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.sectionsService.delete(id, userId);
  }
}
