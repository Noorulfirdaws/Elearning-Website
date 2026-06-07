import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { DeveloperService } from './developer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('developer')
@Controller('developer')
export class DeveloperController {
  constructor(private readonly developerService: DeveloperService) {}

  // API Key management (requires JWT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('keys')
  createApiKey(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() body: { name: string; scopes: string[]; expiresAt?: string },
  ) {
    return this.developerService.createApiKey(userId, {
      name: body.name,
      scopes: body.scopes as any,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      tenantId,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('keys')
  listApiKeys(@CurrentUser('id') userId: string) {
    return this.developerService.getUserApiKeys(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('keys/:id')
  revokeApiKey(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.developerService.revokeApiKey(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('keys/:id/stats')
  keyStats(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.developerService.getUsageStats(userId, id);
  }

  // Public API docs
  @Public()
  @Get('openapi.json')
  getOpenApiSpec() {
    return this.developerService.getOpenApiSpec();
  }

  // Public API endpoints (authenticated with API key via X-API-Key header)
  // These are handled by the ApiKeyGuard middleware (not shown here)
  @ApiSecurity('ApiKey')
  @Get('courses')
  @Public()
  apiGetCourses(@Headers('x-api-key') apiKey: string, @Query() query: any) {
    // In production: validate API key, check scopes, then return data
    return { message: 'Authenticated API access for courses', query };
  }
}
