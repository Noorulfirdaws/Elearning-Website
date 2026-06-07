import { Controller, Get, Post, Body, Param, Query, Res, Redirect } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SsoService } from './sso.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('sso')
@Controller('sso')
export class SsoController {
  constructor(private readonly ssoService: SsoService) {}

  @Public()
  @Get(':tenantId/metadata')
  async getSamlMetadata(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const xml = await this.ssoService.getSamlMetadata(tenantId);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }

  @Public()
  @Get(':tenantId/saml/login')
  async samlLogin(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const loginUrl = await this.ssoService.initiateSamlAuth(tenantId);
    res.redirect(loginUrl);
  }

  @Public()
  @Post(':tenantId/saml/callback')
  async samlCallback(
    @Param('tenantId') tenantId: string,
    @Body('SAMLResponse') samlResponse: string,
    @Res() res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.ssoService.processSamlCallback(tenantId, samlResponse);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/sso/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }

  @Public()
  @Get(':tenantId/oidc/login')
  async oidcLogin(
    @Param('tenantId') tenantId: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const authUrl = await this.ssoService.getOidcAuthUrl(tenantId, state);
    res.redirect(authUrl);
  }

  @Public()
  @Get(':tenantId/oidc/callback')
  async oidcCallback(
    @Param('tenantId') tenantId: string,
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    const { accessToken, refreshToken } = await this.ssoService.processOidcCallback(tenantId, code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/sso/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }
}
