import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BetaService } from './beta.service';

@ApiTags('beta')
@Controller('beta')
export class BetaController {
  constructor(private readonly betaService: BetaService) {}

  /** List all feature flags (admin) */
  @Get('flags')
  @ApiOperation({ summary: 'List all feature flags' })
  listFlags() {
    return this.betaService.listFlags();
  }

  /** Get a single flag */
  @Get('flags/:key')
  @ApiOperation({ summary: 'Get a feature flag' })
  getFlag(@Param('key') key: string) {
    return this.betaService.getFlag(key);
  }

  /** Check which flags are enabled for a user */
  @Get('flags/user/:userId')
  @ApiOperation({ summary: 'Get all feature flags for a user' })
  getUserFlags(@Param('userId') userId: string) {
    return this.betaService.getUserFlags(userId);
  }

  /** Check if a single flag is enabled for a user */
  @Get('flags/:key/check')
  @ApiOperation({ summary: 'Check if a flag is enabled for a user' })
  @ApiQuery({ name: 'userId', required: false })
  checkFlag(@Param('key') key: string, @Query('userId') userId?: string) {
    return { key, enabled: this.betaService.isEnabled(key, userId) };
  }

  /** Update / create a feature flag (admin only — add auth guard in prod) */
  @Patch('flags/:key')
  @ApiOperation({ summary: 'Update a feature flag' })
  upsertFlag(
    @Param('key') key: string,
    @Body() body: { enabled?: boolean; rolloutPct?: number; description?: string },
  ) {
    return this.betaService.upsertFlag({ key, ...body });
  }

  /** Enrol users in beta features */
  @Post('enrol')
  @HttpCode(200)
  @ApiOperation({ summary: 'Enrol a user in beta features' })
  async enrol(@Body() body: { userId: string; flags: string[] }) {
    await this.betaService.enrolBeta(body.userId, body.flags);
    return { enrolled: true, userId: body.userId, flags: body.flags };
  }
}
