import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  create(@CurrentUser('tenantId') tenantId: string, @Body() body: any) {
    return this.integrationsService.create(tenantId, body);
  }

  @Get()
  list(@CurrentUser('tenantId') tenantId: string) {
    return this.integrationsService.list(tenantId);
  }

  @Post(':id/sync')
  sync(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.integrationsService.sync(id, tenantId);
  }

  @Post(':id/import-users')
  importUsers(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.integrationsService.importUsersFromHris(id, tenantId);
  }
}
