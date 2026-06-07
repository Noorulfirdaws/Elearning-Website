import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
  borderRadius?: string;
  darkLogoUrl?: string;
  emailHeaderUrl?: string;
  customCss?: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  customDomain?: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  branding: TenantBranding;
  features: TenantFeatures;
  ssoConfig?: SSOConfig;
  limits: TenantLimits;
  isActive: boolean;
}

export interface TenantFeatures {
  scorm: boolean;
  xapi: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  sso: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  aiFeatures: boolean;
  customCertificates: boolean;
  multiLanguage: boolean;
  offlineAccess: boolean;
  mobileApp: boolean;
}

export interface SSOConfig {
  provider: 'SAML' | 'AZURE_AD' | 'OKTA' | 'GOOGLE_WORKSPACE' | 'CUSTOM_OIDC';
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  domain?: string;
  callbackUrl?: string;
  attributeMapping?: Record<string, string>;
}

export interface TenantLimits {
  maxUsers: number;
  maxCourses: number;
  maxStorageGb: number;
  maxVideoMinutes: number;
  maxMonthlyActiveUsers: number;
}

const PLAN_DEFAULTS: Record<string, { features: TenantFeatures; limits: TenantLimits }> = {
  STARTER: {
    features: {
      scorm: false, xapi: false, customDomain: false, whiteLabel: false,
      sso: false, apiAccess: false, advancedAnalytics: false, aiFeatures: true,
      customCertificates: false, multiLanguage: false, offlineAccess: false, mobileApp: false,
    },
    limits: { maxUsers: 50, maxCourses: 10, maxStorageGb: 5, maxVideoMinutes: 500, maxMonthlyActiveUsers: 50 },
  },
  PROFESSIONAL: {
    features: {
      scorm: true, xapi: true, customDomain: true, whiteLabel: false,
      sso: false, apiAccess: true, advancedAnalytics: true, aiFeatures: true,
      customCertificates: true, multiLanguage: true, offlineAccess: true, mobileApp: false,
    },
    limits: { maxUsers: 500, maxCourses: 100, maxStorageGb: 50, maxVideoMinutes: 5000, maxMonthlyActiveUsers: 500 },
  },
  ENTERPRISE: {
    features: {
      scorm: true, xapi: true, customDomain: true, whiteLabel: true,
      sso: true, apiAccess: true, advancedAnalytics: true, aiFeatures: true,
      customCertificates: true, multiLanguage: true, offlineAccess: true, mobileApp: true,
    },
    limits: { maxUsers: -1, maxCourses: -1, maxStorageGb: -1, maxVideoMinutes: -1, maxMonthlyActiveUsers: -1 },
  },
};

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { name: string; slug: string; plan?: string; adminEmail: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Tenant slug already taken');

    const plan = (dto.plan || 'STARTER').toUpperCase() as keyof typeof PLAN_DEFAULTS;
    const defaults = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.STARTER;

    return this.prisma.tenant.create({
      data: {
        id: uuidv4(),
        name: dto.name,
        slug: dto.slug,
        plan: plan as any,
        adminEmail: dto.adminEmail,
        branding: {
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
          accentColor: '#06b6d4',
          fontFamily: 'Inter',
          borderRadius: '0.5rem',
        },
        features: defaults.features as any,
        limits: defaults.limits as any,
        isActive: true,
      },
    });
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException(`Tenant '${slug}' not found`);
    return tenant;
  }

  async findByDomain(domain: string) {
    return this.prisma.tenant.findFirst({
      where: { OR: [{ domain }, { customDomain: domain }], isActive: true },
    });
  }

  async updateBranding(tenantId: string, branding: Partial<TenantBranding>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        branding: { ...(tenant.branding as any), ...branding },
      },
    });
  }

  async updateCustomDomain(tenantId: string, domain: string) {
    // In production: verify domain ownership via DNS TXT record before allowing
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: domain },
    });
  }

  async configureSso(tenantId: string, config: SSOConfig) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!(tenant.features as any).sso) throw new ConflictException('SSO not available on current plan');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { ssoConfig: config as any },
    });
  }

  async getSsoConfig(tenantId: string): Promise<SSOConfig | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return (tenant?.ssoConfig as unknown as SSOConfig) || null;
  }

  async updateFeatures(tenantId: string, features: Partial<TenantFeatures>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { features: { ...(tenant.features as any), ...features } },
    });
  }

  async getTenantStats(tenantId: string) {
    const [users, courses, storage] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.course.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.file.aggregate({
        where: { tenant: { id: tenantId } },
        _sum: { size: true },
      }),
    ]);

    return {
      users,
      courses,
      storageUsedBytes: storage._sum.size || 0,
      storageUsedGb: ((storage._sum.size || 0) / (1024 ** 3)).toFixed(2),
    };
  }

  async list(page = 1, limit = 20) {
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);
    return { tenants, total, page, limit };
  }
}
