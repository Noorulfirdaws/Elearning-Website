import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() body: { name: string; slug: string; plan?: string; adminEmail: string }) {
    return this.tenantsService.create(body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  list(@Query('page') page: string, @Query('limit') limit: string) {
    return this.tenantsService.list(+page || 1, +limit || 20);
  }

  @Public()
  @Get('resolve')
  resolveByDomain(@Query('domain') domain: string) {
    return this.tenantsService.findByDomain(domain);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  @Patch(':id/branding')
  updateBranding(@Param('id') id: string, @Body() body: any) {
    return this.tenantsService.updateBranding(id, body);
  }

  @Patch(':id/domain')
  updateDomain(@Param('id') id: string, @Body('domain') domain: string) {
    return this.tenantsService.updateCustomDomain(id, domain);
  }

  @Patch(':id/sso')
  configureSso(@Param('id') id: string, @Body() body: any) {
    return this.tenantsService.configureSso(id, body);
  }

  @Get(':id/sso')
  getSso(@Param('id') id: string) {
    return this.tenantsService.getSsoConfig(id);
  }

  @Patch(':id/features')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateFeatures(@Param('id') id: string, @Body() body: any) {
    return this.tenantsService.updateFeatures(id, body);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.tenantsService.getTenantStats(id);
  }
}
