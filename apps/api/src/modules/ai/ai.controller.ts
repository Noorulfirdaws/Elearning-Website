import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('course-outline')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate AI course outline' })
  generateCourseOutline(@Body() body: { topic: string; level: string; targetAudience: string }) {
    return this.aiService.generateCourseOutline(body.topic, body.level, body.targetAudience);
  }

  @Post('quiz-questions')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate AI quiz questions' })
  generateQuizQuestions(
    @Body() body: { topic: string; lessonContent: string; count: number; difficulty: string },
  ) {
    return this.aiService.generateQuizQuestions(body.topic, body.lessonContent, body.count, body.difficulty);
  }

  @Post('assignment')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate AI assignment' })
  generateAssignment(@Body() body: { topic: string; level: string; objectives: string[] }) {
    return this.aiService.generateAssignment(body.topic, body.level, body.objectives);
  }

  @Post('course-summary')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate AI course summary' })
  generateSummary(@Body() body: { courseTitle: string; sections: any[] }) {
    return this.aiService.generateCourseSummary(body.courseTitle, body.sections);
  }

  @Post('chat')
  @ApiOperation({ summary: 'AI tutor chat' })
  chat(
    @Body() body: { messages: { role: 'user' | 'assistant'; content: string }[]; context: string },
  ) {
    return this.aiService.chatTutor(body.messages, body.context);
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Get AI course recommendations' })
  getRecommendations(
    @CurrentUser('id') userId: string,
    @Body() body: { enrolledCourseIds: string[]; interests: string[] },
  ) {
    return this.aiService.getRecommendations(userId, body.enrolledCourseIds, body.interests);
  }
}
