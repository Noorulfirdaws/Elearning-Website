import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AffiliatesService } from './affiliates.service';

@Controller('affiliates')
@UseGuards(JwtAuthGuard)
export class AffiliatesController {
  constructor(private affiliatesService: AffiliatesService) {}

  @Post('apply')
  apply(@Request() req: any, @Body() body: { paypalEmail?: string; website?: string }) {
    return this.affiliatesService.applyForAffiliate(req.user.id, body);
  }

  @Get('me')
  getMyAffiliate(@Request() req: any) {
    return this.affiliatesService.getMyAffiliate(req.user.id);
  }

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.affiliatesService.getAffiliateDashboard(req.user.id);
  }

  @Post('link/:courseId')
  generateLink(@Request() req: any, @Param('courseId') courseId: string) {
    return this.affiliatesService.generateAffiliateLink(req.user.id, courseId);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAll() {
    return this.affiliatesService.getAllAffiliates();
  }

  @Patch('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  approve(@Param('id') id: string) {
    return this.affiliatesService.approveAffiliate(id);
  }
}
