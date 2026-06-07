import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  create(@Request() req: any, @Body() body: { name: string; slug: string; description?: string; logo?: string }) {
    return this.orgsService.createOrg(req.user.id, body);
  }

  @Get('my-orgs')
  getMyOrgs(@Request() req: any) {
    return this.orgsService.getMyOrgs(req.user.id);
  }

  @Get(':id')
  getOrg(@Param('id') id: string) {
    return this.orgsService.getOrg(id);
  }

  @Post(':id/invite')
  inviteMember(@Param('id') id: string, @Request() req: any, @Body() body: { email: string; role: string }) {
    return this.orgsService.inviteMember(id, body.email, body.role, req.user.id);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any) {
    return this.orgsService.removeMember(id, memberId, req.user.id);
  }

  @Get(':id/enrollments')
  getEnrollments(@Param('id') id: string) {
    return this.orgsService.getOrgEnrollments(id);
  }
}
