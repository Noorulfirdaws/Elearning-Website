import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('progress')
@Controller('progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post('lesson/:lessonId')
  @ApiOperation({ summary: 'Update lesson progress' })
  update(
    @Param('lessonId') lessonId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { watchPercentage?: number; timeWatched?: number; lastPosition?: number; isCompleted?: boolean },
  ) {
    return this.progressService.updateLessonProgress(userId, lessonId, body);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get full course progress' })
  getCourseProgress(@Param('courseId') courseId: string, @CurrentUser('id') userId: string) {
    return this.progressService.getCourseProgress(userId, courseId);
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get single lesson progress' })
  getLessonProgress(@Param('lessonId') lessonId: string, @CurrentUser('id') userId: string) {
    return this.progressService.getLessonProgress(userId, lessonId);
  }
}
