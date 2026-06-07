import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Post('free/:courseId')
  @ApiOperation({ summary: 'Enroll in a free course' })
  enrollFree(@Param('courseId') courseId: string, @CurrentUser('id') userId: string) {
    return this.enrollmentsService.enrollFree(userId, courseId);
  }

  @Get('my-enrollments')
  @ApiOperation({ summary: 'Get current user enrollments' })
  getMyEnrollments(@CurrentUser('id') userId: string) {
    return this.enrollmentsService.getUserEnrollments(userId);
  }

  @Get(':courseId/status')
  @ApiOperation({ summary: 'Check enrollment status for a course' })
  checkEnrollment(@Param('courseId') courseId: string, @CurrentUser('id') userId: string) {
    return this.enrollmentsService.isEnrolled(userId, courseId);
  }

  @Get(':courseId/students')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get enrolled students for a course (instructor)' })
  getStudents(@Param('courseId') courseId: string, @CurrentUser('id') userId: string) {
    return this.enrollmentsService.getEnrolledStudents(courseId, userId);
  }
}
