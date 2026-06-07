import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExamsService } from './exams.service';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Get(':id')
  getExam(@Param('id') id: string) {
    return this.examsService.getExam(id, false);
  }

  @Post(':id/start')
  startAttempt(@Param('id') id: string, @Request() req: any) {
    return this.examsService.startAttempt(id, req.user.id);
  }

  @Post('attempts/:attemptId/submit')
  submitAttempt(
    @Param('attemptId') attemptId: string,
    @Request() req: any,
    @Body() body: { answers: Record<string, string> },
  ) {
    return this.examsService.submitAttempt(attemptId, req.user.id, body.answers);
  }

  @Get(':id/my-attempts')
  getMyAttempts(@Param('id') id: string, @Request() req: any) {
    return this.examsService.getMyAttempts(id, req.user.id);
  }
}
