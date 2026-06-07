import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  createSkill(@Body() body: any) {
    return this.skillsService.createSkill(body);
  }

  @Public()
  @Get('tree')
  getSkillTree(@Query('tenantId') tenantId: string) {
    return this.skillsService.getSkillTree(tenantId);
  }

  @Post('assessments')
  createAssessment(@Body() body: any) {
    return this.skillsService.createAssessment(body);
  }

  @Post('assessments/:id/start')
  startAssessment(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.skillsService.startAssessment(id, userId);
  }

  @Post('attempts/:id/submit')
  submitAssessment(
    @Param('id') attemptId: string,
    @CurrentUser('id') userId: string,
    @Body('answers') answers: Record<string, string>,
  ) {
    return this.skillsService.submitAssessment(attemptId, userId, answers);
  }

  @Get('profile')
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.skillsService.getUserSkillProfile(userId);
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser('id') userId: string) {
    return this.skillsService.getSkillRecommendations(userId);
  }

  @Get('users/:userId/profile')
  getUserProfile(@Param('userId') userId: string) {
    return this.skillsService.getUserSkillProfile(userId);
  }
}
