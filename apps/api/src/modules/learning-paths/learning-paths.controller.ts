import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LearningPathsService } from './learning-paths.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('learning-paths')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning-paths')
export class LearningPathsController {
  constructor(private readonly learningPathsService: LearningPathsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @CurrentUser('tenantId') tenantId: string, @Body() body: any) {
    return this.learningPathsService.create(userId, { ...body, tenantId });
  }

  @Public()
  @Get()
  list(@Query('tenantId') tenantId: string) {
    return this.learningPathsService.list(tenantId, true);
  }

  @Get('my-paths')
  myPaths(@CurrentUser('id') userId: string) {
    return this.learningPathsService.getUserPaths(userId);
  }

  @Public()
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.learningPathsService.findById(id);
  }

  @Post(':id/steps')
  addStep(
    @Param('id') pathId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.learningPathsService.addStep(pathId, userId, body);
  }

  @Patch(':id/steps/reorder')
  reorderSteps(
    @Param('id') pathId: string,
    @CurrentUser('id') userId: string,
    @Body('ids') ids: string[],
  ) {
    return this.learningPathsService.reorderSteps(pathId, userId, ids);
  }

  @Post(':id/enroll')
  enroll(@Param('id') pathId: string, @CurrentUser('id') userId: string) {
    return this.learningPathsService.enroll(pathId, userId);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') pathId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { stepId: string; completed: boolean },
  ) {
    return this.learningPathsService.updateProgress(pathId, userId, body.stepId, body.completed);
  }
}
