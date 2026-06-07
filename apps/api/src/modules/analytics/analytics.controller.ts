import { Controller, Get, Post, Query, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('platform/overview')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Platform overview metrics (admin)' })
  getOverview() {
    return this.analyticsService.getPlatformOverview();
  }

  @Get('platform/daily')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Daily platform metrics' })
  getDailyMetrics(@Query('days') days?: number) {
    return this.analyticsService.getDailyMetrics(days);
  }

  @Get('instructor/me')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Instructor analytics for their courses' })
  getInstructorAnalytics(@CurrentUser('id') userId: string) {
    return this.analyticsService.getInstructorAnalytics(userId);
  }

  @Get('course/:courseId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Course-specific analytics' })
  getCourseAnalytics(@Param('courseId') courseId: string) {
    return this.analyticsService.getCourseAnalytics(courseId);
  }

  @Post('track')
  @ApiOperation({ summary: 'Track analytics event' })
  track(@CurrentUser('id') userId: string, @Body() body: { event: string; properties?: any }) {
    return this.analyticsService.trackEvent(userId, body.event, body.properties);
  }
}
