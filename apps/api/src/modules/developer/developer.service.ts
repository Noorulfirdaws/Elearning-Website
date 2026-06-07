import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export type ApiKeyScope =
  | 'courses:read' | 'courses:write'
  | 'users:read' | 'users:write'
  | 'enrollments:read' | 'enrollments:write'
  | 'analytics:read'
  | 'certificates:read'
  | 'webhooks:read' | 'webhooks:write'
  | '*';

@Injectable()
export class DeveloperService {
  constructor(private prisma: PrismaService) {}

  async createApiKey(userId: string, dto: {
    name: string;
    scopes: ApiKeyScope[];
    expiresAt?: Date;
    tenantId?: string;
  }) {
    const rawKey = `lms_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        id: uuidv4(),
        userId,
        tenantId: dto.tenantId,
        name: dto.name,
        keyHash,
        keyPrefix,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
        isActive: true,
      },
    });

    // Return raw key only once — never stored
    return { ...apiKey, key: rawKey };
  }

  async validateApiKey(rawKey: string): Promise<{
    userId: string; tenantId?: string; scopes: ApiKeyScope[];
  }> {
    if (!rawKey.startsWith('lms_')) throw new UnauthorizedException('Invalid API key format');

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.apiKey.findFirst({ where: { keyHash, isActive: true } });

    if (!apiKey) throw new UnauthorizedException('Invalid or revoked API key');
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    // Track usage
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    });

    return {
      userId: apiKey.userId,
      tenantId: apiKey.tenantId || undefined,
      scopes: apiKey.scopes as ApiKeyScope[],
    };
  }

  async getUserApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true, name: true, keyPrefix: true, scopes: true,
        isActive: true, lastUsedAt: true, usageCount: true,
        createdAt: true, expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(id: string, userId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new NotFoundException('API key not found');
    return this.prisma.apiKey.update({ where: { id }, data: { isActive: false } });
  }

  // Rate limiting (uses Redis in prod; here using DB for simplicity)
  async checkRateLimit(keyId: string, windowMs = 60000, max = 100): Promise<{ ok: boolean; remaining: number }> {
    const windowStart = new Date(Date.now() - windowMs);
    const count = await this.prisma.apiUsageLog.count({
      where: { apiKeyId: keyId, createdAt: { gte: windowStart } },
    });

    if (count >= max) return { ok: false, remaining: 0 };

    await this.prisma.apiUsageLog.create({
      data: { apiKeyId: keyId, endpoint: 'check' },
    });

    return { ok: true, remaining: max - count - 1 };
  }

  // Public API documentation endpoints
  getOpenApiSpec() {
    return {
      openapi: '3.1.0',
      info: {
        title: 'LMS Platform Public API',
        version: '1.0',
        description: 'Programmatic access to courses, users, enrollments, certificates, and analytics.',
        contact: { email: 'api@lms.platform' },
      },
      servers: [{ url: '/api/v1', description: 'Production' }],
      security: [{ ApiKey: [] }],
      components: {
        securitySchemes: {
          ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          BearerToken: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      paths: {
        '/developer/courses': {
          get: { summary: 'List courses', tags: ['Courses'], parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ]},
        },
        '/developer/users': {
          get: { summary: 'List users', tags: ['Users'] },
          post: { summary: 'Create user', tags: ['Users'] },
        },
        '/developer/enrollments': {
          get: { summary: 'List enrollments', tags: ['Enrollments'] },
          post: { summary: 'Enroll user in course', tags: ['Enrollments'] },
        },
        '/developer/certificates': {
          get: { summary: 'List certificates', tags: ['Certificates'] },
        },
      },
    };
  }

  async logUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number) {
    await this.prisma.apiUsageLog.create({
      data: { apiKeyId, endpoint, method, statusCode },
    });
  }

  async getUsageStats(userId: string, apiKeyId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: apiKeyId, userId } });
    if (!key) throw new NotFoundException('API key not found');

    const logs = await this.prisma.apiUsageLog.groupBy({
      by: ['endpoint', 'statusCode'],
      where: { apiKeyId },
      _count: true,
      orderBy: { _count: { endpoint: 'desc' } },
    });

    return { usageCount: key.usageCount, lastUsedAt: key.lastUsedAt, breakdown: logs };
  }
}
