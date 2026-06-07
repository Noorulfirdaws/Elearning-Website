import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('lessons/:lessonId/quiz')
  create(
    @Param('lessonId') lessonId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.quizzesService.create(lessonId, userId, body);
  }

  @Get('lessons/:lessonId/quiz')
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.quizzesService.findByLesson(lessonId);
  }

  @Post('quizzes/:id/start')
  startAttempt(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.quizzesService.startAttempt(id, userId);
  }

  @Post('quiz-attempts/:id/submit')
  submitAttempt(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('answers') answers: Record<string, any>,
  ) {
    return this.quizzesService.submitAttempt(id, userId, answers);
  }

  @Get('quizzes/:id/attempts')
  getUserAttempts(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.quizzesService.getUserAttempts(id, userId);
  }
}
