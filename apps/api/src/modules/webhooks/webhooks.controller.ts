import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  create(@Body() body: any, @CurrentUser('tenantId') tenantId: string) {
    return this.webhooksService.create(tenantId, body);
  }

  @Get()
  list(@CurrentUser('tenantId') tenantId: string) {
    return this.webhooksService.list(tenantId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.webhooksService.findById(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.webhooksService.update(id, tenantId, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.webhooksService.delete(id, tenantId);
  }

  @Post(':id/rotate-secret')
  rotateSecret(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.webhooksService.rotateSecret(id, tenantId);
  }

  @Get(':id/deliveries')
  deliveries(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit: string,
  ) {
    return this.webhooksService.deliveries(id, tenantId, +limit || 50);
  }

  @Post('deliveries/:id/redeliver')
  redeliver(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.webhooksService.redeliver(id, tenantId);
  }
}
