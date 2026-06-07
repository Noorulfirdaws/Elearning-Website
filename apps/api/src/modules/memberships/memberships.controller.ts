import { Controller, Get, Post, Delete, UseGuards, Request, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MembershipsService } from './memberships.service';

@Controller('memberships')
export class MembershipsController {
  constructor(private membershipsService: MembershipsService) {}

  @Get('plans')
  getPlans() {
    return this.membershipsService.getPlans();
  }

  @Get('my-membership')
  @UseGuards(JwtAuthGuard)
  getMyMembership(@Request() req: any) {
    return this.membershipsService.getUserMembership(req.user.id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@Request() req: any, @Body() body: { planId: string; stripeSubscriptionId: string }) {
    return this.membershipsService.subscribeToPlan(req.user.id, body.planId, body.stripeSubscriptionId);
  }

  @Delete('cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Request() req: any) {
    return this.membershipsService.cancelMembership(req.user.id);
  }
}
