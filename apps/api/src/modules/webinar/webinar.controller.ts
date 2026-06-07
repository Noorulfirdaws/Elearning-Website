import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WebinarService } from './webinar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webinars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webinars')
export class WebinarController {
  constructor(private readonly webinarService: WebinarService) {}

  @Post()
  create(
    @CurrentUser('id') instructorId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.webinarService.create(instructorId, { ...body, tenantId });
  }

  @Public()
  @Get('upcoming')
  getUpcoming(@Query('tenantId') tenantId: string) {
    return this.webinarService.getUpcoming(tenantId);
  }

  @Post(':id/register')
  register(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.webinarService.register(id, userId);
  }

  @Post(':id/join')
  getJoinToken(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('role') role: 'host' | 'participant',
  ) {
    return this.webinarService.getJoinToken(id, userId, role || 'participant');
  }

  @Patch(':id/start')
  startWebinar(@Param('id') id: string, @CurrentUser('id') instructorId: string) {
    return this.webinarService.start(id, instructorId);
  }

  @Patch(':id/end')
  endWebinar(@Param('id') id: string, @CurrentUser('id') instructorId: string) {
    return this.webinarService.end(id, instructorId);
  }

  @Get(':id/recordings')
  getRecordings(@Param('id') id: string) {
    return this.webinarService.getRecordings(id);
  }
}
