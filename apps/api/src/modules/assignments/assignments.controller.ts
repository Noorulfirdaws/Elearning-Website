import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AssignmentsService } from './assignments.service';

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Get(':id')
  getAssignment(@Param('id') id: string) {
    return this.assignmentsService.getAssignment(id);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Request() req: any, @Body() body: { content?: string; fileUrl?: string }) {
    return this.assignmentsService.submitAssignment(id, req.user.id, body);
  }

  @Get(':id/my-submission')
  getMySubmission(@Param('id') id: string, @Request() req: any) {
    return this.assignmentsService.getMySubmission(id, req.user.id);
  }

  @Get(':id/submissions')
  getSubmissions(@Param('id') id: string) {
    return this.assignmentsService.getSubmissionsForAssignment(id);
  }

  @Patch('submissions/:submissionId/grade')
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() body: { grade: number; feedback: string },
    @Request() req: any,
  ) {
    return this.assignmentsService.gradeSubmission(submissionId, body.grade, body.feedback, req.user.id);
  }
}
