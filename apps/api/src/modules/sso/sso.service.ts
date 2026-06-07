import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantsService } from '../tenants/tenants.service';
import * as saml2 from 'saml2-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SsoService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwtService: JwtService,
    private tenantsService: TenantsService,
  ) {}

  // SAML SSO
  async getSamlMetadata(tenantId: string): Promise<string> {
    const ssoConfig = await this.tenantsService.getSsoConfig(tenantId);
    if (!ssoConfig || !['SAML', 'AZURE_AD', 'OKTA'].includes(ssoConfig.provider)) {
      throw new BadRequestException('SAML not configured for this tenant');
    }

    const spOptions: saml2.ServiceProviderOptions = {
      entity_id: `${this.config.get('app.frontendUrl')}/sso/${tenantId}/metadata`,
      private_key: this.config.get('app.saml.privateKey') || '',
      certificate: this.config.get('app.saml.certificate') || '',
      assert_endpoint: `${this.config.get('app.backendUrl')}/api/v1/sso/${tenantId}/saml/callback`,
    };

    const sp = new saml2.ServiceProvider(spOptions);
    return new Promise((resolve, reject) => {
      const metadata = sp.create_metadata();
      resolve(metadata);
    });
  }

  async initiateSamlAuth(tenantId: string): Promise<string> {
    const ssoConfig = await this.tenantsService.getSsoConfig(tenantId);
    if (!ssoConfig) throw new BadRequestException('SSO not configured');

    const spOptions: saml2.ServiceProviderOptions = {
      entity_id: `${this.config.get('app.frontendUrl')}/sso/${tenantId}/metadata`,
      private_key: this.config.get('app.saml.privateKey') || '',
      certificate: this.config.get('app.saml.certificate') || '',
      assert_endpoint: `${this.config.get('app.backendUrl')}/api/v1/sso/${tenantId}/saml/callback`,
    };

    const idpOptions: saml2.IdentityProviderOptions = {
      sso_login_url: ssoConfig.ssoUrl || '',
      sso_logout_url: ssoConfig.ssoUrl || '',
      certificates: [ssoConfig.certificate || ''],
    };

    const sp = new saml2.ServiceProvider(spOptions);
    const idp = new saml2.IdentityProvider(idpOptions);

    return new Promise((resolve, reject) => {
      sp.create_login_request_url(idp, {}, (err, loginUrl) => {
        if (err) reject(err);
        else resolve(loginUrl);
      });
    });
  }

  async processSamlCallback(tenantId: string, samlResponse: string): Promise<{
    accessToken: string; refreshToken: string; user: any;
  }> {
    const ssoConfig = await this.tenantsService.getSsoConfig(tenantId);
    if (!ssoConfig) throw new BadRequestException('SSO not configured');

    const spOptions: saml2.ServiceProviderOptions = {
      entity_id: `${this.config.get('app.frontendUrl')}/sso/${tenantId}/metadata`,
      private_key: this.config.get('app.saml.privateKey') || '',
      certificate: this.config.get('app.saml.certificate') || '',
      assert_endpoint: `${this.config.get('app.backendUrl')}/api/v1/sso/${tenantId}/saml/callback`,
    };

    const idpOptions: saml2.IdentityProviderOptions = {
      sso_login_url: ssoConfig.ssoUrl || '',
      sso_logout_url: ssoConfig.ssoUrl || '',
      certificates: [ssoConfig.certificate || ''],
    };

    const sp = new saml2.ServiceProvider(spOptions);
    const idp = new saml2.IdentityProvider(idpOptions);

    const response: any = await new Promise((resolve, reject) => {
      sp.post_assert(idp, { request_body: { SAMLResponse: samlResponse } }, (err, result) => {
        if (err) reject(new UnauthorizedException('SAML assertion failed: ' + err.message));
        else resolve(result);
      });
    });

    const mapping = ssoConfig.attributeMapping || {};
    const email = response.user.attributes[mapping['email'] || 'email']?.[0] ||
                  response.user.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']?.[0] ||
                  response.user.name_id;

    const firstName = response.user.attributes[mapping['firstName'] || 'firstName']?.[0] ||
                      response.user.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']?.[0] || 'SSO';
    const lastName = response.user.attributes[mapping['lastName'] || 'lastName']?.[0] ||
                     response.user.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']?.[0] || 'User';

    return this.findOrCreateSsoUser(tenantId, email, firstName, lastName, ssoConfig.provider);
  }

  // OIDC / Azure AD / Okta
  async getOidcAuthUrl(tenantId: string, state?: string): Promise<string> {
    const ssoConfig = await this.tenantsService.getSsoConfig(tenantId);
    if (!ssoConfig) throw new BadRequestException('SSO not configured');

    const callbackUrl = `${this.config.get('app.backendUrl')}/api/v1/sso/${tenantId}/oidc/callback`;
    const nonce = uuidv4();

    let authUrl: string;
    if (ssoConfig.provider === 'AZURE_AD') {
      authUrl = `https://login.microsoftonline.com/${ssoConfig.tenantId}/oauth2/v2.0/authorize` +
        `?client_id=${ssoConfig.clientId}` +
        `&response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&scope=openid+profile+email&state=${state || ''}&nonce=${nonce}`;
    } else if (ssoConfig.provider === 'OKTA') {
      authUrl = `https://${ssoConfig.domain}/oauth2/v1/authorize` +
        `?client_id=${ssoConfig.clientId}` +
        `&response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&scope=openid+profile+email&state=${state || ''}&nonce=${nonce}`;
    } else {
      throw new BadRequestException('Unsupported OIDC provider');
    }

    return authUrl;
  }

  async processOidcCallback(tenantId: string, code: string): Promise<{
    accessToken: string; refreshToken: string; user: any;
  }> {
    const ssoConfig = await this.tenantsService.getSsoConfig(tenantId);
    if (!ssoConfig) throw new BadRequestException('SSO not configured');

    const callbackUrl = `${this.config.get('app.backendUrl')}/api/v1/sso/${tenantId}/oidc/callback`;

    let tokenEndpoint: string;
    if (ssoConfig.provider === 'AZURE_AD') {
      tokenEndpoint = `https://login.microsoftonline.com/${ssoConfig.tenantId}/oauth2/v2.0/token`;
    } else if (ssoConfig.provider === 'OKTA') {
      tokenEndpoint = `https://${ssoConfig.domain}/oauth2/v1/token`;
    } else {
      tokenEndpoint = ssoConfig.ssoUrl || '';
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: ssoConfig.clientId || '',
      client_secret: ssoConfig.clientSecret || '',
    });

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) throw new UnauthorizedException('OIDC token exchange failed');
    const tokenData = await res.json();

    // Decode id_token (JWT claims without verification for simplicity; in prod verify signature)
    const claims = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString());
    const email = claims.email || claims.preferred_username || claims.upn;
    const firstName = claims.given_name || claims.name?.split(' ')[0] || 'SSO';
    const lastName = claims.family_name || claims.name?.split(' ').slice(1).join(' ') || 'User';

    return this.findOrCreateSsoUser(tenantId, email, firstName, lastName, ssoConfig.provider);
  }

  private async findOrCreateSsoUser(
    tenantId: string, email: string, firstName: string, lastName: string, provider: string,
  ) {
    let user = await this.prisma.user.findFirst({ where: { email, tenantId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: 'STUDENT',
          isEmailVerified: true,
          tenantId,
          ssoProvider: provider,
        },
      });
    } else if (!user.ssoProvider) {
      await this.prisma.user.update({ where: { id: user.id }, data: { ssoProvider: provider } });
    }

    const jwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: this.config.get('app.jwt.secret'),
      expiresIn: '15m',
    });

    const refreshToken = uuidv4();
    await this.prisma.session.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
    });

    return { accessToken, refreshToken, user };
  }
}
